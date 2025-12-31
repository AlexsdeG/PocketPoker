import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Player, PlayerActionType, GamePhase } from "../types";
import { HandEvaluator } from "./handEvaluator";

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
    const { communityCards, minBet, pot, players, phase, config } = gameState;
    const currentBet = bot.currentBet;
    const callAmount = minBet - currentBet;
    const isCheckAvailable = callAmount === 0;
    
    // Evaluate Hand Semantic
    const handResult = HandEvaluator.evaluate(bot.holeCards, communityCards);
    
    // Format Cards
    const formatCard = (c: any) => `${c.rank}${c.suit}`;
    const holeCardsStr = bot.holeCards.map(formatCard).join(", ");
    const boardStr = communityCards.length > 0 ? communityCards.map(formatCard).join(", ") : "None";
    
    // Win Odds (Only if allowed)
    const winOddsInfo = config.aiCanSeeOdds && bot.winOdds !== undefined 
        ? `Estimated Win Probability: ${bot.winOdds}%` 
        : "Win Probability: Unknown (Calculate based on hand strength)";

    // Game Context String
    const prompt = `
      You are a professional poker player AI playing No Limit Texas Hold'em.
      Your goal is to maximize your chips. Play optimally based on the game state.
      
      --- GAME STATE ---
      Phase: ${phase}
      Pot Size: $${pot}
      Your Stack: $${bot.chips}
      Your Hand: [${holeCardsStr}]
      Community Cards: [${boardStr}]
      Current Hand Rank: ${handResult.descr}
      ${winOddsInfo}
      
      --- BETTING ---
      Amount to Call: $${callAmount} (if 0, you can CHECK)
      Minimum Raise: $${gameState.minRaise}
      Your Current Round Bet: $${currentBet}
      Active Players: ${players.filter(p => p.isActive && !p.isAllIn).length}
      
      --- INSTRUCTIONS ---
      Decide your action: FOLD, CHECK, CALL, or RAISE.
      - FOLD: Give up the hand.
      - CHECK: Pass action if Amount to Call is 0.
      - CALL: Match the bet of $${callAmount}.
      - RAISE: Increase the bet. If you raise, specify the TOTAL amount (Current Bet + Raise).
      
      Respond in JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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