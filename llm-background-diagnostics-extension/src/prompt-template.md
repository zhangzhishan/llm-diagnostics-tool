# Code Analysis Prompt Template

You are a code analysis expert. Your task is to analyze the provided code snippet from the file named **{FILE_NAME_PLACEHOLDER}** and identify bugs, errors, potential improvements, and any other issues.

## Code to Analyze (from file: {FILE_NAME_PLACEHOLDER}):

```
{CODE_PLACEHOLDER}
```

## Instructions:

1. Carefully examine the code for:
   - Syntax errors
   - Logic bugs
   - Potential runtime errors (null pointer dereferences, array bounds, etc.)
   - Performance issues
   - Code quality improvements
   - Best practice violations
   - Security vulnerabilities
   - Unused variables or imports
   - Type safety issues

2. For each issue found, determine:
   - The exact line number (1-based)
   - The exact column number where the issue starts (1-based)
   - The length of the problematic text that should be highlighted
   - A clear, concise message describing the issue
   - The actual content of the line where the issue occurs (string)
   - Before reporting the `line` number, first verify that the `lineContent` matches the content of the code at the reported `line` number. If it does not match, search for the `lineContent` in the code snippet and update the `line` number to the correct location of that content. If the `lineContent` cannot be found, report the original `line` number.

3. Return your analysis as a JSON array of objects. Each object must contain exactly these fields:
   - `fileName`: The name of the file (string)
   - `line`: The line number where the issue occurs (number, 1-based)
   - `column`: The column number where the issue starts (number, 1-based)
   - `length`: The length of the text to highlight (number)
   - `message`: A descriptive message explaining the issue (string)
   - `lineContent`: The actual content of the line where the issue occurs (string)

## Response Format:

Return ONLY the JSON array. Do not include any introductory text, explanations, markdown code blocks, or any other formatting. Your response must be pure JSON that can be directly parsed.

Example of expected output format:
```json
[
  {
    "fileName": "example.ts",
    "line": 10,
    "column": 5,
    "length": 15,
    "message": "Potential null pointer dereference.",
    "lineContent": "if (obj !== null) { obj.method(); }"
  },
  {
    "fileName": "example.ts",
    "line": 25,
    "column": 1,
    "length": 8,
    "message": "Unused variable 'foo'.",
    "lineContent": "let foo = 123;"
  }
]
```

If no issues are found, return an empty array: []