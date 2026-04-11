#include <iostream>
#include <string>
#include <vector>

// Turn a title into a simple slug-like key used for logs.
std::string to_key(const std::string& title) {
	std::string result;
	for (char ch : title) {
		if (ch == ' ') {
			result.push_back('_');
		} else if (ch >= 'A' && ch <= 'Z') {
			result.push_back(static_cast<char>(ch - 'A' + 'a'));
		} else {
			result.push_back(ch);
		}
	}
	return result;
}

// Return the average of non-negative numbers only.
double average_non_negative(const std::vector<int>& values) {
	int count = 0;
	int sum = 0;

	for (int value : values) {
		if (value >= 0) {
			sum += value;
			count += 1;
		}
	}

	return count == 0 ? 0.0 : static_cast<double>(sum) / count;
}

int main() {
	std::vector<int> values = {5, -1, 7, 12, -3};
	std::cout << "Key: " << to_key("Daily Report") << "\n";
	std::cout << "Average: " << average_non_negative(values) << "\n";
	return 0;
}
