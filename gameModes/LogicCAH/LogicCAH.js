const fs = require("fs");
const path = require("path");

/**
 * LogicCAH - Logic Cards Against Humanity
 * Core game logic and mechanics
 */

class LogicCAH {
    constructor(players, numRounds, timeLimit, numPrompts) {
        this.players = players; // Array of player objects with { id, name }
        this.numRounds = numRounds;
        this.timeLimit = timeLimit; // in seconds
        this.numPrompts = numPrompts;

        this.scores = {};
        this.players.forEach((p) => {
            this.scores[p.id] = 0;
        });

        this.currentRound = 0;
        this.currentDeciderIndex = 0;
        this.roundState = "WAITING_FOR_ANSWERS"; // WAITING_FOR_ANSWERS, SHOWING_ANSWERS, ROUND_COMPLETE
        this.playerAnswers = {}; // { playerId: [answers] }
        this.selectedPlayerId = null;

        this.promptDeck = [];
        this.discardedPrompts = [];
        this.currentPrompts = [];

        this.loadPrompts();
        this.currentPromps = this.drawPrompts(this.numPrompts);

    }

    loadPrompts() {

        const cardsPath = path.join(__dirname, "cards.json");

        if (!fs.existsSync(cardsPath)) {
            throw new Error("cards.json file not found in LogicCAH directory");
        }

        let data;
        try {
            data = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
        } catch (error) {
            throw new Error("Error parsing cards.json file");
        }

        if (!Array.isArray(data.black_cards)) {
            throw new Error("Invalid cards.json format: 'black_cards' should be an array");
        }
    
        this.promptDeck = data.black_cards
            .map((prompt) => String(prompt).trim())
            .filter((prompt) => prompt.length > 0);

        if (this.promptDeck.length < this.numPrompts * this.numRounds) {
            throw new Error("Not enough prompts in the deck to support the number of rounds and prompts per round");
        }

        this.shuffle(this.promptDeck);

    }

    //shuffle
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    //draw prompt, recycles from the discard pile is neccessary
    drawPrompt() {
        
        if (this.promptDeck.length === 0) {

            if (this.discardedPrompts.length === 0) {

                return "[No more prompts available]";

            }

            this.promptDeck = [...this.discardPrompts];
            this.discardedPrompts = [];
            this.shuffle(this.promptDeck);

        }

        return this.promptDeck.pop();

    }

    drawPrompts(count) {

        const prompts = [];

        for (let i = 0; i < count; i++) {

            const prompt = this.drawPrompt();
            prompts.push(prompt);
            
        }

        return prompts;

    }

    /**
     * Get the current decider
     */
    getCurrentDecider() {
        return this.players[this.currentDeciderIndex];
    }

    /**
     * Get all non-decider players
     */
    getNonDeciders() {
        return this.players.filter((_, idx) => idx !== this.currentDeciderIndex);
    }

    /**
     * Check if all non-deciders have submitted answers
     */
    allAnswersSubmitted() {
        const nonDeciders = this.getNonDeciders();
        return nonDeciders.every(
            (player) => this.playerAnswers[player.id] && this.playerAnswers[player.id].length === this.numPrompts
        );
    }

    /**
     * Submit answers from a player
     * @param {string} playerId
     * @param {array} answers - Array of answers for each prompt
     */
    submitAnswers(playerId, answers) {
        if (this.roundState !== "WAITING_FOR_ANSWERS") {
            throw new Error("Answers cannot be submitted at this time");
        }

        const player = this.players.find((p) => p.id === playerId);
        if (!player) {
            throw new Error("Player not found");
        }

        if (playerId === this.getCurrentDecider().id) {
            throw new Error("The decider cannot submit answers");
        }

        if (!Array.isArray(answers)) {
            throw new Error("Answers must be an array");
        }

        if (answers.length !== this.numPrompts) {
            throw new Error(`Expected ${this.numPrompts} answers, got ${answers.length}`);
        }

        const cleanedAnswers = answers.map((answer) => String(answer).trim());

        if (cleanedAnswers.some((answer) => answer.length === 0)) {
            throw new Error("Answers cannot be blank");
        }

        this.playerAnswers[playerId] = cleanedAnswers;

        // If all answers are in, move to showing answers
        if (this.allAnswersSubmitted()) {
            this.roundState = "SHOWING_ANSWERS";
        }

        return {
            success: true,
            allSubmitted: this.allAnswersSubmitted(),
        };
    }

    /**
     * Get all submitted answers anonymously for the decider
     * Returns array of answer sets with player references removed
     */
    getAnonymousAnswers() {
        if (this.roundState !== "SHOWING_ANSWERS") {
            throw new Error("Answers are not ready to be shown");
        }

        const nonDeciders = this.getNonDeciders().map((player) => ({
            playerId: player.id,
            answers: this.playerAnswers[player.id],
        }));

        //shuffle answers
        for (let i = nonDeciders.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nonDeciders[i], nonDeciders[j]] = [nonDeciders[j], nonDeciders[i]];
        }

        return nonDeciders;

    }

    /**
     * Decider selects which player's answers they agree with most
     * @param {string} selectedPlayerId
     */
    deciderSelectsAnswers(selectedPlayerId) {
        if (this.roundState !== "SHOWING_ANSWERS") {
            throw new Error("Cannot select answers at this time");
        }

        const player = this.players.find((p) => p.id === selectedPlayerId);
        if (!player) {
            throw new Error("Player not found");
        }

        if (selectedPlayerId === this.getCurrentDecider().id) {
            throw new Error("Decider cannot select their own answers");
        }

        this.selectedPlayerId = selectedPlayerId;
        this.scores[selectedPlayerId]++;

        return {
            success: true,
            selectedPlayer: player.name,
            pointAwarded: true,
        };
    }

    /**
     * Reveal the selected player's name to all players
     */
    revealSelectedPlayer() {
        if (!this.selectedPlayerId) {
            throw new Error("No player has been selected yet");
        }

        const selectedPlayer = this.players.find((p) => p.id === this.selectedPlayerId);
        return {
            selectedPlayerName: selectedPlayer.name,
            points: this.scores[this.selectedPlayerId],
        };
    }

    /**
     * Complete the current round and move to next
     */
    completeRound() {

        this.discardedPrompts.push(...this.currentPrompts);
        this.currentRound++;
        this.currentDeciderIndex = (this.currentDeciderIndex + 1) % this.players.length;
        this.playerAnswers = {};
        this.selectedPlayerId = null;
        this.roundState = "WAITING_FOR_ANSWERS";


        if (!this.isGameOver()) {
            this.currentPrompts = this.drawPrompts(this.numPrompts);
        }

        return {
            roundComplete: true,
            nextRound: this.currentRound,
            nextDecider: this.getCurrentDecider(),
            prompts: this.currentPrompts,
        };
    }

    /**
     * Check if the game is over
     */
    isGameOver() {
        return this.currentRound >= this.numRounds;
    }

    /**
     * Get final scores
     */
    getFinalScores() {
        if (!this.isGameOver()) {
            throw new Error("Game is not over yet");
        }

        return this.players
            .map((p) => ({
                name: p.name,
                score: this.scores[p.id],
            }))
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Get current game status
     */
    getGameStatus() {
        return {
            currentRound: this.currentRound,
            totalRounds: this.numRounds,
            currentDecider: this.getCurrentDecider(),
            roundState: this.roundState,
            scores: this.players.map((p) => ({
                playerId: p.id,
                name: p.name,
                score: this.scores[p.id],
            })),
            isGameOver: this.isGameOver(),
            numPrompts: this.numPrompts,
            currentPrompts: this.currentPrompts,
            timeLimit: this.timeLimit,
        };
    }
}

module.exports = LogicCAH;
