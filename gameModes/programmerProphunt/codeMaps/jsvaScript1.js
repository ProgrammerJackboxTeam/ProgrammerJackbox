// Normalize display names for consistent UI labels.
function normalizeName(input) {
	if (!input) {
		return "guest";
	}
	return String(input).trim().toLowerCase();
}

// Add points while protecting against negative values.
function addPoints(currentScore, delta) {
	const safeCurrent = Math.max(0, Number(currentScore) || 0);
	const safeDelta = Number(delta) || 0;
	return Math.max(0, safeCurrent + safeDelta);
}

function summarizeRound(teamName, scoreBefore, pointsEarned) {
	const scoreAfter = addPoints(scoreBefore, pointsEarned);
	return `${teamName} moved from ${scoreBefore} to ${scoreAfter}.`;
}

console.log(normalizeName("  Round Host  "));
console.log(summarizeRound("Team A", 3, 2));
