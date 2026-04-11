#include <stdbool.h>
#include <stdio.h>

/* Keep values in a small expected range so output is predictable. */
int clamp_score(int value, int minimum, int maximum) {
	if (value < minimum) {
		return minimum;
	}
	if (value > maximum) {
		return maximum;
	}
	return value;
}

/* Count how many values are above or equal to the pass mark. */
int count_passing(const int scores[], int length, int pass_mark) {
	int total = 0;
	for (int i = 0; i < length; i++) {
		if (scores[i] >= pass_mark) {
			total++;
		}
	}
	return total;
}

int main(void) {
	int raw_scores[] = {42, 88, 103, -5, 76};
	int adjusted[5];

	for (int i = 0; i < 5; i++) {
		adjusted[i] = clamp_score(raw_scores[i], 0, 100);
	}

	printf("Passing count: %d\n", count_passing(adjusted, 5, 60));
	return 0;
}
