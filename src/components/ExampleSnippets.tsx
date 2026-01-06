import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileCode, ChevronDown } from "lucide-react";
import { Language } from "./LanguageSelector";

interface ExampleSnippetsProps {
  onSelect: (code: string, language: Language) => void;
}

interface Example {
  name: string;
  language: Language;
  code: string;
}

const EXAMPLES: Example[] = [
  {
    name: "Hello World",
    language: "cpp",
    code: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
  },
  {
    name: "Fibonacci",
    language: "cpp",
    code: `#include <iostream>
#include <vector>

std::vector<int> fibonacci(int n) {
    std::vector<int> result;
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        result.push_back(a);
        int temp = a + b;
        a = b;
        b = temp;
    }
    return result;
}

int main() {
    auto fib = fibonacci(10);
    for (int num : fib) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    return 0;
}`,
  },
  {
    name: "Binary Search",
    language: "python",
    code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1

# Example usage
numbers = [1, 3, 5, 7, 9, 11, 13, 15]
result = binary_search(numbers, 7)
print(f"Found at index: {result}")`,
  },
  {
    name: "Quick Sort",
    language: "java",
    code: `public class QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            int pivotIndex = partition(arr, low, high);
            quickSort(arr, low, pivotIndex - 1);
            quickSort(arr, pivotIndex + 1, high);
        }
    }

    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        
        int temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        
        return i + 1;
    }

    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        quickSort(arr, 0, arr.length - 1);
        
        for (int num : arr) {
            System.out.print(num + " ");
        }
    }
}`,
  },
  {
    name: "Fetch API",
    language: "javascript",
    code: `async function fetchUserData(userId) {
  try {
    const response = await fetch(\`https://api.example.com/users/\${userId}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const userData = await response.json();
    console.log("User data:", userData);
    return userData;
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    throw error;
  }
}

// Example usage
fetchUserData(123)
  .then(user => console.log("Fetched:", user.name))
  .catch(err => console.log("Error:", err));`,
  },
  {
    name: "Class Example",
    language: "python",
    code: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def area(self):
        return self.width * self.height
    
    def perimeter(self):
        return 2 * (self.width + self.height)
    
    def __str__(self):
        return f"Rectangle({self.width}x{self.height})"

# Create and use rectangle
rect = Rectangle(5, 3)
print(f"{rect}")
print(f"Area: {rect.area()}")
print(f"Perimeter: {rect.perimeter()}")`,
  },
];

const ExampleSnippets = ({ onSelect }: ExampleSnippetsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileCode className="h-4 w-4" />
          Examples
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Load Example Code</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXAMPLES.map((example) => (
          <DropdownMenuItem
            key={example.name}
            onClick={() => onSelect(example.code, example.language)}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase w-10">
                {example.language === "cpp" ? "C++" : example.language}
              </span>
              {example.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExampleSnippets;
