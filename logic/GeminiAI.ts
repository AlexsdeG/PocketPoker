import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Player, PlayerActionType, GamePhase } from "../types";
import { HandEvaluator } from "./handEvaluator";

const MODEL = 'gemini-3-flash-preview';

export const GeminiAI = {
  /**
   * Decides the next move for a bot using Google Gemini API.
   */
  async decide(gameState: GameState, bot: Player): Promise<{ action: PlayerActionType; amount?: number }> {
    // Safety check if API Key is missing, fallback to FOLD (or handle error upstream)
    if (!process.env.API_KEY) {
        console.warn("Gemini AI called without API Key. Folding.");
        return { action: PlayerActionType.FOLD };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct the context for the AI
    const { communityCards, minBet, pot, players, phase, config, dealerIndex } = gameState;
    const currentBet = bot.currentBet;
    const callAmount = minBet - currentBet;
    const isCheckAvailable = callAmount === 0;
    
    // Evaluate Hand Semantic
    const handResult = HandEvaluator.evaluate(bot.holeCards, communityCards);
    
    // Format Cards
    const formatCard = (c: any) => `${c.rank}${c.suit}`;
    const holeCardsStr = bot.holeCards.map(formatCard).join(", ");
    const boardStr = communityCards.length > 0 ? communityCards.map(formatCard).join(", ") : "None";
    
    // Position Context
    const activePlayers = players.filter(p => p.isActive && !p.isAllIn);
    const myIndex = players.findIndex(p => p.id === bot.id);
    const isDealer = myIndex === dealerIndex;
    const isBigBlind = myIndex === (dealerIndex + 2) % players.length;
    const positionDescr = isDealer ? "Dealer (Button)" : isBigBlind ? "Big Blind" : "Generic Position";
    
    const opponentsCount = activePlayers.length - 1;

    // Win Odds (Only if allowed)
    const winOddsInfo = config.aiCanSeeOdds && bot.winOdds !== undefined 
        ? `Estimated Win Probability: ${bot.winOdds}%` 
        : "Win Probability: Unknown (Calculate based on hand strength)";

    // Playstyle / Persona Context. Persona traits are richer than the bare
    // enum: when present, we inject the numeric profile that the heuristic
    // engine also uses so Gemini-controlled bots behave consistently.
    const persona = bot.runtimePersona;
    const mood = bot.mood ?? 'normal';
    const tilt = bot.tiltLevel ?? 0;
    let styleInstructions: string;
    if (persona) {
        const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
        styleInstructions = `
You play to a numeric persona. Each trait is in 0..1. Higher means MORE of that quality:
  • aggression:      ${fmt(persona.aggression)}   (raises vs marginal hands)
  • tightness:       ${fmt(persona.tightness)}    (folds weak hands preflop)
  • bluffFrequency:  ${fmt(persona.bluffFrequency)} (pure bluff likelihood)
  • callStation:     ${fmt(persona.callStation)}  (calls instead of fold/raise)
  • trapping:        ${fmt(persona.trapping)}     (slow-plays monsters)
  • adaptability:    ${fmt(persona.adaptability)} (reacts to opp aggression)
Current mood: ${mood}.  Tilt level: ${fmt(tilt)} (high tilt → looser, more emotional).
Match these numbers — don't be a caricature. Subtle wins.`;
    } else {
        const playStyle = bot.playStyle || 'RANDOM';
        styleInstructions = ({
            'RANDOM':     "You are unpredictable. Mix actions, but stay rational.",
            'AGGRESSIVE': "Loose-aggressive. Raise marginal hands, bluff regularly, but fold weak vs huge bets.",
            'PASSIVE':    "Tight-passive. Rarely raise, prefer check/call with reasonable hands, fold trash.",
            'SCHLITZOHR': "Tricky. Trap with monsters (check-raise), float with backdoors, mix it up.",
            'TAG':        "Tight-aggressive. Play strong hands hard, fold marginal pre, value-bet flop.",
            'LAG':        "Loose-aggressive. Wide range, lots of barrels, controlled bluffs.",
            'NIT':        "Very tight. Only premium hands. Almost no bluffs.",
            'ROCK':       "Ultra-tight. Only AA/KK/QQ/AK type holdings get played.",
            'CALLING_STATION': "Calls too much. Rarely folds, almost never raises without strong hands.",
            'MANIAC':     "Hyper-aggressive. Bluffs often, raises pots constantly — but still fold pure air vs huge bets.",
            'WILD_CARD':  "Unpredictable. High variance. Mix bluffs, traps, and folds.",
        } as Record<string, string>)[playStyle] || "Play standard optimal poker.";
    }

    // Game Context String
    const prompt = `
      You are a professional poker player AI playing No Limit Texas Hold'em.
      ${styleInstructions}
      
      --- GAME STATE ---
      Phase: ${phase}
      Pot Size: $${pot}
      Your Stack: $${bot.chips}
      Your Hand: [${holeCardsStr}]
      Community Cards: [${boardStr}]
      Current Hand Rank: ${handResult.descr}
      Your Position: ${positionDescr}
      Opponents Remaining: ${opponentsCount}
      ${winOddsInfo}
      
      --- BETTING ---
      Amount to Call: $${callAmount} (if 0, you can CHECK)
      Minimum Raise: $${gameState.minRaise}
      Your Current Round Bet: $${currentBet}
      
      --- INSTRUCTIONS ---
      Decide your action: FOLD, CHECK, CALL, or RAISE.
      
      IMPORTANT STRATEGY:
      1. DO NOT FOLD if "Amount to Call" is $0. ALWAYS CHECK instead. Free cards are valuable.
      2. If you have a decent hand or a draw (Straight/Flush draw), prefer CALL or RAISE.
      3. If you have a Pair or better, usually do not Fold on the Flop/Turn unless the bet is massive.
      4. If you are Aggressive, prefer Raising over Calling if you have any piece of the board.
      
      Respond in JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: { 
                            type: Type.STRING, 
                            enum: ["FOLD", "CHECK", "CALL", "RAISE"],
                            description: "The action to take."
                        },
                        amount: { 
                            type: Type.NUMBER,
                            description: "The total bet amount if raising (must be >= current bet + min raise)."
                        }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        const actionStr = json.action?.toUpperCase();
        let amount = json.amount;

        // Validation & Safety Fallbacks
        let finalAction = PlayerActionType.FOLD;

        if (actionStr === "CHECK") {
            finalAction = isCheckAvailable ? PlayerActionType.CHECK : PlayerActionType.FOLD;
        } else if (actionStr === "CALL") {
            finalAction = PlayerActionType.CALL;
        } else if (actionStr === "RAISE") {
            finalAction = PlayerActionType.RAISE;
            // Validate Raise Amount
            const minRaiseAmt = minBet + gameState.minRaise;
            if (!amount || amount < minRaiseAmt) amount = minRaiseAmt;
            if (amount > bot.chips + currentBet) amount = bot.chips + currentBet; // Cap at All-in
        } else {
            finalAction = PlayerActionType.FOLD;
        }

        return { action: finalAction, amount };

    } catch (error) {
        console.error("Gemini AI Error:", error);
        // Fallback to safe action
        return { action: isCheckAvailable ? PlayerActionType.CHECK : PlayerActionType.FOLD };
    }
  }
};