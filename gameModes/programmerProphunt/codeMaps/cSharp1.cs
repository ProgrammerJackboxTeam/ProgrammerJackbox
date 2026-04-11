using System;
using System.Collections.Generic;

public static class MapUtilities
{
	// Keep player tags consistent and easy to read.
	public static string BuildTag(string name)
	{
		if (string.IsNullOrWhiteSpace(name))
		{
			return "guest";
		}

		return name.Trim().ToLowerInvariant().Replace(" ", "_");
	}

	// Compute the average of values that are zero or greater.
	public static double AverageNonNegative(List<int> values)
	{
		int sum = 0;
		int count = 0;

		foreach (var value in values)
		{
			if (value >= 0)
			{
				sum += value;
				count++;
			}
		}

		return count == 0 ? 0.0 : (double)sum / count;
	}

	public static void Main()
	{
		var scores = new List<int> { 10, 8, -1, 12 };
		Console.WriteLine($"Tag: {BuildTag("Round Host")}");
		Console.WriteLine($"Average: {AverageNonNegative(scores):F2}");
	}
}
