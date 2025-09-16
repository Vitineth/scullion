import { useParamState } from "../utils.tsx";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";
type Class = {
  $type: "class";
  $className: string;
  [k: string]: Node;
};

type Map = {
  $type: "map";
  [k: string]: Node;
};

type Optional = {
  $type: "optional";
  value: Node | null;
};

type Node = Node[] | Optional | Class | Map | {} | string | number | boolean;

class JavaObjectFormatter {
  private input: string = "";
  private position: number = 0;

  parse(input: string): Node {
    this.input = input.trim();
    this.position = 0;
    return this.parseValue();
  }

  private parseValue(): Node {
    this.skipWhitespace();
    const char = this.peek();

    // Check for array - only if we see '[' at the start of input or after ',' or '['
    const isArrayStart = char === "[" && this.isAtStructuralPosition();

    if (isArrayStart) {
      return this.parseArray();
    } else if (char === "{") {
      return this.parseMap();
    } else if (this.isOptional()) {
      return this.parseOptional();
    } else if (this.isClassName()) {
      return this.parseClass();
    } else {
      return this.parsePrimitive();
    }
  }

  private isAtStructuralPosition(): boolean {
    // Arrays should start at beginning of input, after ',' (array elements), or after '[' (nested arrays)
    // BUT NOT after '=' - that might be a string value that starts with [
    if (this.position === 0) return true;

    // Look back to find the last non-whitespace character
    let lookBack = this.position - 1;
    while (lookBack >= 0 && /\s/.test(this.input[lookBack])) {
      lookBack--;
    }

    if (lookBack >= 0) {
      const prevChar = this.input[lookBack];
      // Arrays can start after comma (for array elements) or opening brackets (nested)
      // Special case: after '=' only if we're really sure it's an array (check next few chars)
      if (prevChar === "," || prevChar === "[") {
        return true;
      } else if (prevChar === "=") {
        // Only treat as array if we see clear array patterns like multiple elements
        return this.looksLikeArrayAfterEquals();
      }
    }

    return false;
  }

  private looksLikeArrayAfterEquals(): boolean {
    // Look ahead to see if this looks like a proper array: [elem1, elem2, ...] or []
    let pos = this.position + 1; // Skip the '['
    let depth = 1;
    let hasComma = false;
    let isEmpty = false;

    // Check for empty array first
    while (pos < this.input.length && /\s/.test(this.input[pos])) {
      pos++;
    }
    if (pos < this.input.length && this.input[pos] === "]") {
      isEmpty = true;
    }

    if (isEmpty) return true; // [] is definitely an array

    // Check for comma-separated elements
    pos = this.position + 1;
    while (pos < this.input.length && depth > 0) {
      const char = this.input[pos];
      if (char === "[") {
        depth++;
      } else if (char === "]") {
        depth--;
      } else if (char === "," && depth === 1) {
        hasComma = true;
      }
      pos++;
    }

    // If we found a comma at the top level, it's likely a real array
    return hasComma;
  }

  private parseArray(): Node[] {
    this.skipWhitespace();

    if (this.peek() !== "[") {
      throw new Error("Expected [");
    }

    this.advance(); // Skip '['
    this.skipWhitespace();

    const result: Node[] = [];

    // Handle empty array
    if (this.peek() === "]") {
      this.advance(); // Skip ']'
      return result;
    }

    while (this.position < this.input.length && this.peek() !== "]") {
      this.skipWhitespace();

      // Check if we're at the end of the array before parsing
      if (this.peek() === "]") {
        break;
      }

      const value = this.parseValue();
      result.push(value);

      this.skipWhitespace();

      if (this.peek() === ",") {
        this.advance(); // Skip ','
      } else if (this.peek() === "]") {
        break;
      } else {
        // If we don't see comma or ], break to avoid infinite loop
        break;
      }
    }

    if (this.peek() === "]") {
      this.advance(); // Skip ']'
    }

    return result;
  }

  private parseClass(): Class {
    this.skipWhitespace();

    // Extract class name
    const className = this.parseClassName();

    if (this.peek() !== "{") {
      throw new Error("Expected { after class name");
    }

    this.advance(); // Skip '{'
    this.skipWhitespace();

    const result: Class = {
      $type: "class",
      $className: className,
    };

    // Handle empty class
    if (this.peek() === "}") {
      this.advance(); // Skip '}'
      return result;
    }

    // Parse field=value pairs
    while (this.position < this.input.length && this.peek() !== "}") {
      this.skipWhitespace();

      const fieldName = this.parseFieldName();
      this.skipWhitespace();

      if (this.peek() !== "=") {
        throw new Error("Expected = after field name");
      }

      this.advance(); // Skip '='
      this.skipWhitespace();

      const value = this.parseValue();
      result[fieldName] = value;

      this.skipWhitespace();
      if (this.peek() === ",") {
        this.advance(); // Skip ','
      } else if (this.peek() === "}") {
        break;
      }
    }

    if (this.peek() === "}") {
      this.advance(); // Skip '}'
    }

    return result;
  }

  private parseClassName(): string {
    this.skipWhitespace();
    let className = "";

    while (this.position < this.input.length && this.peek() !== "{") {
      className += this.advance();
    }

    return className.trim();
  }

  private parseFieldName(): string {
    this.skipWhitespace();
    let fieldName = "";

    while (this.position < this.input.length) {
      const char = this.peek();

      if (
        char === "=" ||
        char === "," ||
        char === "}" ||
        char === "]" ||
        /\s/.test(char)
      ) {
        break;
      }

      fieldName += this.advance();
    }

    return fieldName.trim();
  }

  private parseMap(): Map | {} {
    this.skipWhitespace();

    if (this.peek() !== "{") {
      throw new Error("Expected {");
    }

    this.advance(); // Skip '{'
    this.skipWhitespace();

    // Handle empty object
    if (this.peek() === "}") {
      this.advance(); // Skip '}'
      return {};
    }

    const result: Map = {
      $type: "map",
    };

    // Parse field=value pairs
    while (this.position < this.input.length && this.peek() !== "}") {
      this.skipWhitespace();

      const fieldName = this.parseFieldName();
      this.skipWhitespace();

      if (this.peek() !== "=") {
        throw new Error("Expected = after field name");
      }

      this.advance(); // Skip '='
      this.skipWhitespace();

      const value = this.parseValue();
      result[fieldName] = value;

      this.skipWhitespace();
      if (this.peek() === ",") {
        this.advance(); // Skip ','
      } else if (this.peek() === "}") {
        break;
      }
    }

    if (this.peek() === "}") {
      this.advance(); // Skip '}'
    }

    return result;
  }

  private parseOptional(): Optional | string {
    this.skipWhitespace();

    // Check for Optional.empty
    if (this.input.substr(this.position, 14) === "Optional.empty") {
      this.position += 14;
      return { $type: "optional", value: null };
    }

    // Parse Optional[value]
    if (this.input.substr(this.position, 9) === "Optional[") {
      this.position += 9; // Skip 'Optional['

      // Parse the value inside Optional[...] as a primitive string
      const value = this.parseOptionalValue();

      this.skipWhitespace();
      if (this.peek() === "]") {
        this.advance(); // Skip ']'
      }
      return { $type: "optional", value };
    }

    throw new Error("Invalid Optional format");
  }

  private parseOptionalValue(): string {
    this.skipWhitespace();
    let value = "";

    while (this.position < this.input.length) {
      const char = this.peek();

      if (char === "]") {
        // End of Optional
        break;
      } else {
        value += this.advance();
      }
    }

    return value.trim();
  }

  private parsePrimitive(): string | number | boolean {
    const value = this.parseValueString();

    // If no value was parsed, we're at end of structure - don't infinite loop
    if (
      value === "" &&
      (this.peek() === "}" || this.peek() === "]" || this.peek() === "")
    ) {
      return "";
    }

    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue) && value.trim() !== "") {
      return numValue;
    }

    // Check for booleans
    if (value === "true") return true;
    if (value === "false") return false;

    // Return as string
    return value;
  }

  private parseValueString(): string {
    this.skipWhitespace();
    let value = "";
    let braceDepth = 0;

    while (this.position < this.input.length) {
      const char = this.peek();

      if (char === "{") {
        braceDepth++;
        value += this.advance();
      } else if (char === "}") {
        if (braceDepth === 0) {
          // End of current structure
          break;
        }
        braceDepth--;
        value += this.advance();
      } else if (char === "," && braceDepth === 0) {
        // Check if this comma is at the start of a new line (continuation pattern)
        // If the next non-whitespace character is a field name pattern, this comma ends the value
        const nextNonWhitespace = this.peekNextNonWhitespace();
        if (nextNonWhitespace && this.looksLikeFieldStart(this.position + 1)) {
          break;
        }
        value += this.advance();
      } else if (char === "]" && braceDepth === 0 && value === "") {
        // Empty value at end of array
        break;
      } else {
        value += this.advance();
      }
    }

    return value.trim();
  }

  private peekNextNonWhitespace(): string {
    let pos = this.position + 1;
    while (pos < this.input.length && /[ \t]/.test(this.input[pos])) {
      pos++;
    }
    return pos < this.input.length ? this.input[pos] : "";
  }

  private looksLikeFieldStart(startPos: number): boolean {
    // Skip whitespace
    while (startPos < this.input.length && /[ \t]/.test(this.input[startPos])) {
      startPos++;
    }

    // Look for pattern: word characters followed by =
    let pos = startPos;
    while (pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[pos])) {
      pos++;
    }

    // Skip whitespace
    while (pos < this.input.length && /[ \t]/.test(this.input[pos])) {
      pos++;
    }

    return pos < this.input.length && this.input[pos] === "=";
  }

  private peek(): string {
    return this.position < this.input.length ? this.input[this.position] : "";
  }

  private advance(): string {
    return this.position < this.input.length ? this.input[this.position++] : "";
  }

  private skipWhitespace(): void {
    while (
      this.position < this.input.length &&
      /[ \t]/.test(this.input[this.position])
    ) {
      this.position++;
    }
  }

  private isOptional(): boolean {
    return this.input.substr(this.position, 8) === "Optional";
  }

  private isClassName(): boolean {
    // Check if current position starts with ClassName{ pattern
    const remaining = this.input.substr(this.position);
    return /^[A-Z]\w*\{/.test(remaining);
  }
}

export function consumeToTree(input: string): Node {
  const formatter = new JavaObjectFormatter();
  const x = formatter.parse(input);
  console.log(x);
  return x;
}

function treeToHTMLWithoutIndent(tree: Node): string {
  return treeToHTML(tree, 0);
}

function treeToHTML(tree: Node | null, indent: number = 0): string {
  if (tree === null) {
    return `<span>null</span>`;
  }

  if (typeof tree === "object" && "$type" in tree) {
    // Actual object
    switch (tree.$type) {
      case "class":
      case "map":
        return `<details open class=""><summary><span class="identifier">${tree.$className ?? ""}</span>{<span class="show-on-hide">...}</span></summary><div class="ind-${indent + 1}">${Object.entries(
          tree,
        )
          .filter((e) => e[0] !== "$type" && e[0] !== "$className")
          .map(
            (entry) =>
              `<span class="identifier ">${entry[0]}</span>=${treeToHTML(entry[1], indent + 1)}`,
          )
          .join("<br/>")}</div>}</details>`;
        break;

      case "optional":
        return `<span class="optional">Optional</span>[<span class="value">${treeToHTML(tree.value, indent)}</span>]`;
    }
  } else if (typeof tree === "object" && Array.isArray(tree)) {
    return (
      `<details open class=""><summary>[<span class="show-on-hide">...]</span></summary><div class="ind-${indent + 1}">` +
      tree.map((e) => treeToHTML(e, indent)).join("<br/>") +
      "</div>]</details>"
    );
  } else {
    // Primitive
    return `<span class="value">"${tree}"</span>`;
  }
}

export function LogFormatter() {
  const [value, setValue] = useParamState("v", true);

  const parser = consumeToTree;
  const renderer = treeToHTMLWithoutIndent;

  return (
    <div class="log-formatter">
      <InputPane value={value} setValue={setValue} requestFocus />
      <div class="right">
        <RenderingPane content={value} parser={parser} renderer={renderer} />
      </div>
    </div>
  );
}
