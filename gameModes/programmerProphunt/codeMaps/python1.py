from typing import Iterable


def clean_name(name: str) -> str:
	"""Normalize a player name for stable comparisons."""
	if not name:
		return "guest"
	return name.strip().lower()


def average_non_negative(values: Iterable[int]) -> float:
	"""Average only values that are at least zero."""
	kept = [value for value in values if value >= 0]
	if not kept:
		return 0.0
	return sum(kept) / len(kept)


def format_round_summary(team_name: str, before: int, earned: int) -> str:
	"""Create a short summary line for a score update."""
	after = max(0, before + earned)
	return f"{team_name} moved from {before} to {after}."


if __name__ == "__main__":
	print(clean_name("  Round Host  "))
	print(average_non_negative([10, -1, 6, 8]))
	print(format_round_summary("Team B", 4, 2))
