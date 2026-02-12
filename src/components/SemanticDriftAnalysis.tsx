/**
 * Semantic Drift Analysis Component
 * 
 * Where semantic preservation is validated:
 * - Each failure case demonstrates a known area where code translation models
 *   may produce semantically different output
 * - List comprehensions: Python's concise syntax may lose filtering semantics
 * - Recursion: Base case handling and stack semantics differ across languages
 * - Exception handling: Try/catch semantics vary (checked vs unchecked exceptions)
 * - Each case shows input, model output, explanation, and suggested improvement
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface FailureCase {
  id: string;
  category: string;
  severity: "high" | "medium" | "low";
  inputCode: string;
  modelOutput: string;
  explanation: string;
  improvement: string;
}

const FAILURE_CASES: FailureCase[] = [
  {
    id: "list-comprehension",
    category: "List Comprehension",
    severity: "high",
    inputCode: `# Python: Filtered list comprehension
squares = [x**2 for x in range(20) if x % 3 == 0]`,
    modelOutput: `// Java: Missing filter condition
List<Integer> squares = new ArrayList<>();
for (int x = 0; x < 20; x++) {
    squares.add(x * x); // BUG: filter omitted
}`,
    explanation:
      "The model failed to preserve the conditional filter (x % 3 == 0) from the list comprehension. " +
      "This is a common semantic drift where the filtering predicate is lost during translation, " +
      "resulting in a superset of the intended output.",
    improvement:
      "Enforce IR constraint propagation: extract the filter predicate as a separate IR node " +
      "and verify its presence in the generated output. Add a post-translation AST check for " +
      "conditional expressions in loop constructs.",
  },
  {
    id: "recursion",
    category: "Recursion",
    severity: "medium",
    inputCode: `# Python: Recursive factorial with proper base case
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    modelOutput: `// Java: Incorrect base case boundary
public static int factorial(int n) {
    if (n == 0) { // BUG: n <= 1 changed to n == 0
        return 1;
    }
    return n * factorial(n - 1);
}`,
    explanation:
      "The model narrowed the base case from 'n <= 1' to 'n == 0', which causes " +
      "factorial(1) to recurse one extra time. While the final result is the same for positive integers, " +
      "the semantic boundary condition is different and may cause issues with edge cases (e.g., negative input).",
    improvement:
      "Add base-case equivalence verification in the IR layer. Compare predicate expressions " +
      "in recursive function base cases between source and target to detect boundary shifts.",
  },
  {
    id: "exception-handling",
    category: "Exception Handling",
    severity: "high",
    inputCode: `# Python: Multiple exception types with specific handling
try:
    result = int(user_input)
    value = data[result]
except ValueError:
    print("Invalid number format")
except IndexError:
    print("Index out of range")
except Exception as e:
    print(f"Unexpected error: {e}")`,
    modelOutput: `// Java: Collapsed exception handling
try {
    int result = Integer.parseInt(userInput);
    Object value = data[result];
} catch (Exception e) { // BUG: all exceptions collapsed
    System.out.println("Error: " + e.getMessage());
}`,
    explanation:
      "The model collapsed three distinct exception handlers into a single generic catch block. " +
      "This loses the differentiated error handling semantics — ValueError maps to NumberFormatException, " +
      "IndexError maps to ArrayIndexOutOfBoundsException. The generic catch also swallows " +
      "the specific error messages.",
    improvement:
      "Maintain exception type mapping in IR: create a cross-language exception equivalence table. " +
      "Verify that the number of catch blocks in the output matches the source, and that each " +
      "exception type has a corresponding mapping.",
  },
];

export default function SemanticDriftAnalysis({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            Semantic Drift Analysis
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Known failure modes where translation models produce semantically divergent output.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {FAILURE_CASES.map((fc) => (
            <AccordionItem key={fc.id} value={fc.id}>
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor:
                        fc.severity === "high"
                          ? "hsl(0, 72%, 50%)"
                          : fc.severity === "medium"
                            ? "hsl(38, 92%, 50%)"
                            : "hsl(200, 80%, 50%)",
                      color:
                        fc.severity === "high"
                          ? "hsl(0, 72%, 50%)"
                          : fc.severity === "medium"
                            ? "hsl(38, 92%, 50%)"
                            : "hsl(200, 80%, 50%)",
                    }}
                  >
                    {fc.severity}
                  </Badge>
                  <span>{fc.category}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  {/* Input Code */}
                  <div>
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      Input Code
                    </p>
                    <pre className="p-3 rounded border border-border bg-muted/30 text-xs font-mono overflow-x-auto whitespace-pre">
                      {fc.inputCode}
                    </pre>
                  </div>

                  {/* Model Output */}
                  <div>
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      Model Output
                    </p>
                    <pre className="p-3 rounded border border-destructive/30 bg-destructive/5 text-xs font-mono overflow-x-auto whitespace-pre">
                      {fc.modelOutput}
                    </pre>
                  </div>

                  {/* Explanation */}
                  <div>
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      Semantic Mismatch Explanation
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">
                      {fc.explanation}
                    </p>
                  </div>

                  {/* Improvement */}
                  <div>
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      Suggested Improvement
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">
                      {fc.improvement}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
