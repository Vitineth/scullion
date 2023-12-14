import { useParamState } from "../utils.tsx";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";

type Node = {
	type: 'root' | 'variable' | 'class' | 'optional' | 'literal',
	parent: Node | null,
	children?: (Node | string)[],
	name?: string,
	value?: any,
	metaType?: string,
};

function consumeToTree(value: string) {
	const rootNode: Node = { children: [], type: 'root', parent: null };
	let activeNode: Node = rootNode;

	let accumulator = '';
	for (let i = 0; i < value.length; i++) {
		const c = value.charAt(i);

		if (c === '{') {
			// Open Class
			console.debug(`Opening class ${ accumulator.trim() }`, activeNode);

			const newNode: Node = { type: 'class', name: accumulator.trim(), parent: activeNode, children: [] };
			if (activeNode.type === 'variable' && !Object.hasOwn(activeNode, 'children') && !('children' in activeNode)) {
				activeNode.value = newNode;
			} else {
				if (activeNode.children === undefined) activeNode.children = [];
				activeNode.children.push(newNode);
			}
			activeNode = newNode;
			accumulator = '';
		} else if (c === '}') {
			// Options:
			//   * Variable
			//      * Not an array => need to save the accumulator, unless the value is already set

			if (activeNode.type === 'variable') {
				if (activeNode.value === undefined) {
					activeNode.value = accumulator.trim();
				}

				if (activeNode.parent === null) throw new Error('Invalid document - parent was null');
				activeNode = activeNode.parent;

				console.debug('Closing (implied)', activeNode.name, activeNode);

				// if(inArray) inArray = false;
			} else {
				console.debug('Closing', activeNode.name, activeNode)
				// if (activeNode.parent.type === 'variable' && Object.hasOwn(activeNode.parent, 'children')) {
				// 	console.debug('****', activeNode);
				// }
			}

			// Close Class
			if (activeNode.parent === null) throw new Error('Invalid document - parent was null');
			activeNode = activeNode.parent;
			accumulator = '';
		} else if (c === '=') {
			// Assign Variable
			if (activeNode.type === 'class') {
				// Currently in a class and the accumulator contains the variable name
				console.debug(`Assignment to class variable ${ accumulator.trim() }`);
				const newNode: Node = { type: 'variable', name: accumulator.trim(), value: undefined, parent: activeNode };
				if (activeNode.children === undefined) activeNode.children = [];
				activeNode.children.push(newNode);
				activeNode = newNode;
				accumulator = '';
			} else {
				console.debug(`Assignment to variable ${ activeNode.name }`);
			}
		} else if (c === ',') {
			if (activeNode.type === 'variable') {
				if (Object.hasOwn(activeNode, 'children')) {
					// Is an array
					if (accumulator.trim().length > 0) {
						console.debug('Pushing literal', accumulator, 'to array', activeNode);
						if (activeNode.children === undefined) activeNode.children = [];
						activeNode.children.push(accumulator);
						accumulator = '';
					}
				} else {
					// Find the index of the next comma
					const commaIndex = value.indexOf(',', i + 1);
					// And then find the next delimiter
					const delimiterIndex = Math.min(
						value.indexOf('=', i + 1),
						value.indexOf(']', i + 1),
						value.indexOf('}', i + 1),
					);
					if (commaIndex < delimiterIndex) {
						// Then this comma is likely part of text so pretend it didn't exist
						accumulator += ',';
						continue;
					}

					if (activeNode.value === undefined) {
						activeNode.value = accumulator;
					}

					console.debug('Finished assigning value to', activeNode.name, activeNode);
					if (activeNode.parent === null) throw new Error('Invalid document - parent was null');
					activeNode = activeNode.parent;
					accumulator = '';
				}
			}
		} else if (c === '[') {
			if (accumulator.trim() === 'Optional') {
				console.debug(`Opening Optional[] value`);
				const idx = value.indexOf(']', i + 1);
				const v: Node = { type: 'optional', value: value.substring(i + 1, idx), parent: activeNode };
				if (Object.hasOwn(activeNode, 'children')) {
					if (activeNode.children === undefined) activeNode.children = [];
					activeNode.children.push(v);
				} else {
					activeNode.value = v;
				}
				i = idx;
			} else {
				if (activeNode.type === 'variable') {
					console.debug(`Converting ${ activeNode.name } to array`);
					// console.log(activeNode.name, 'is array');
					activeNode.children = [];
				} else {
					throw new Error('Unexpected case');
				}
			}
		} else if (c === ']') {
			console.debug(`Closing array ${ activeNode.name }`);
			if (accumulator.trim().length !== 0) {
				if (activeNode.children === undefined) activeNode.children = [];
				activeNode.children.push({ type: 'literal', value: accumulator, parent: activeNode });
				accumulator = '';
			}

			if (activeNode.parent === null) throw new Error('Invalid document - parent was null');
			activeNode = activeNode.parent;
		} else {
			accumulator += c;
		}
	}

	return rootNode;
}

function treeToHTML(tree: Node | string, indent = 0) {
	function rootToHtml(tree: Node, indent: number) {
		if (tree.children === undefined) return '';
		return tree.children.map((e) => treeToHtmlInternal(e, indent)).join('');
	}

	function variableToHtml(tree: Node, indent: number) {
		if (Object.hasOwn(tree, 'children') && tree.children) {
			if (tree.children.length === 0) {
				return `<span class="identifier ind-${ indent }">${ tree.name }</span>=[],<br/>`;
			}
			return `<details open class="ind-${ indent }"><summary><span class="identifier">${ tree.name }</span>=[<span class="show-on-hide">...]</span></summary>${ tree.children.map((e) => treeToHTML(e, 1)).join('') }]</details>`;
		} else {
			if (typeof (tree.value) === 'string') {
				if ((tree.metaType ?? "string") === "string") {
					return `<span class="identifier ind-${ indent }">${ tree.name }</span>=<span class="value type-${ tree.metaType ?? 'string' }">"${ tree.value }"</span>,<br/>`
				} else {
					return `<span class="identifier ind-${ indent }">${ tree.name }</span>=<span class="value type-${ tree.metaType ?? 'string' }">${ tree.value }</span>,<br/>`
				}
			} else if (typeof (tree.value) === 'object' && tree.value.type === 'class') {
				return `<details open class="ind-${ indent }"><summary><span class="identifier">${ tree.name }</span>=<span class="class">${ tree.value.name }</span>{<span class="show-on-hide">...}</span></summary>${ classToHtml(tree.value, 0, true, true) }}</details>`
			} else {
				return `<span class="identifier ind-${ indent }">${ tree.name }</span>=${ treeToHtmlInternal(tree.value, indent) },<br/>`
			}
		}
	}

	function classToHtml(tree: Node, indent: number, skipDetails = false, omitWrapper = false) {
		if (skipDetails) {
			if (omitWrapper) {
				return (tree.children ?? []).map((e) => treeToHtmlInternal(e, indent + 1)).join('');
			} else {
				return `<span class="identifier ind-${ indent } class">${ tree.name }</span>{<br/>${ (tree.children ?? []).map((e) => treeToHtmlInternal(e, indent + 1)).join('') }}`;
			}
		} else {
			if (omitWrapper) {
				throw new Error('Cannot omit name in a details element')
			} else {
				return `<details open class="ind-${ indent }"><summary><span class="identifier class">${ tree.name }</span>{<span class="show-on-hide">...}</summary>${ (tree.children ?? []).map((e) => treeToHtmlInternal(e, 1)).join('') }}</details>`;
			}
		}
	}

	function literalToHtml(tree: Node, indent: number) {
		return `<span class="ind-${ indent } value">"${ tree.value }"</span><br/>`;
	}

	function optionalToHtml(tree: Node, indent: number) {
		return `<span class="optional ind-${ indent }">Optional</span>["<span class="value">${ tree.value }</span>"]`;
	}

	const entityMap: Record<Node['type'], (n: Node, i: number) => string> = {
		'root': rootToHtml,
		'variable': variableToHtml,
		'class': classToHtml,
		'literal': literalToHtml,
		'optional': optionalToHtml,
	};
	const fallback = () => 'UNKNOWN';

	function treeToHtmlInternal(tree: Node | string, indent: number) {
		if (typeof (tree) === 'string') return tree;
		return (entityMap[tree.type] ?? fallback)(tree, indent);
	}

	if (typeof (tree) === 'string') return tree;
	return treeToHtmlInternal(tree, indent);
}

export function LogFormatter() {
	const [value, setValue] = useParamState('v');

	const parser = consumeToTree;
	const renderer = treeToHTML;

	return (
		<div class="log-formatter">
			<InputPane value={ value } setValue={ setValue } requestFocus/>
			<div class="right">
				<RenderingPane content={ value } parser={ parser } renderer={ renderer }/>
			</div>
		</div>
	)
}
