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

    // Playstyle Context
    const playStyle = bot.playStyle || 'RANDOM';
    const styleInstructions = {
        'RANDOM': "You are unpredictable. Occasionally bluff or make wild moves, but generally try to win.",
        'AGGRESSIVE': "You are an Aggressive player. You like to Raise and Re-Raise. You bluff frequently. You treat checks as weakness.",
        'PASSIVE': "You are a Passive player (Calling Station). You rarely Raise. You prefer to Check/Call unless you have the nuts.",
        'SCHLITZOHR': "You are a 'Tricky' player. You trap with strong hands (Check-Raise). You float with weak hands to bluff later. You are unpredictable."
    }[playStyle] || "Play standard optimal poker.";

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