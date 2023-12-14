import jq from 'jq-web';
import { useParamState } from "../utils.tsx";
import { SearchBar } from "../components/search-bar.tsx";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";

function tryJsonParse(v: string) {
	try {
		return JSON.parse(v);
	} catch (e) {
		console.debug('Failed to parse to json', e);
		return null;
	}
}

function tryJq(json: object, search: string) {
	try {
		const result = jq.json(json, search);
		return result;
	} catch (e) {
		console.debug('Failed to search', e);
		return null;
	}
}


function jsonToHTML(tree: any, indent: number = 0) {
	function objectToHtml(tree: object, indent: number): string {
		if (Object.hasOwn(tree, '$$class') && '$$class' in tree) {
			console.debug('objectToHtml', 'class', tree, indent, Object.entries(tree));
			return `<details open class="ind-${ indent }"><summary><span class="identifier class">${ tree["$$class"] }</span>{<span class="show-on-hide">...}</summary>${ Object.entries(tree).filter((e) => e[0] !== "$$class").map((e) => variableToHtml(e[0], e[1], 1)).join('') }}</details>`;
		} else {
			console.debug('objectToHtml', 'default', tree, indent, Object.entries(tree));
			return `<details open class="ind-${ indent }"><summary>{<span class="show-on-hide">...}</summary>${ Object.entries(tree).map((e) => variableToHtml(e[0], e[1], 1)).join('') }}</details>`;
		}
	}

	function variableToHtml(key: string, value: unknown, indent: number): string {
		console.debug('variableToHtml', key, value, indent);
		if (typeof (value) === 'object') {
			if (value === null) {
				return `<span class="identifier ind-${ indent }">${ key }</span>=null,<br/>`;
			}
			if (value === undefined) {
				return `<span class="identifier ind-${ indent }">${ key }</span>=undefined,<br/>`;
			}
			if (Array.isArray(value)) {
				// Array
				if (value.length === 0) {
					return `<span class="identifier ind-${ indent }">${ key }</span>=[],<br/>`;
				}
				return `<details open class="ind-${ indent }"><summary><span class="identifier">${ key }</span>=[<span class="show-on-hide">...]</summary>${ value.map((e) => treeToHtmlInternal(e, 1)).join('') }]</details>`;
			} else {
				// Object
				if (Object.hasOwn(value, '$$class') && '$$class' in value) {
					return `<details open class="ind-${ indent }"><summary><span class="identifier">${ key }</span>=<span class="class">${ value["$$class"] }</span>{<span class="show-on-hide">...}</span></summary>${ Object.entries(value).filter((e) => e[0] !== "$$class").map((e) => variableToHtml(e[0], e[1], 1)).join('') }}</details>`
				} else {
					return `<details open class="ind-${ indent }"><summary><span class="identifier">${ key }</span>={<span class="show-on-hide">...}</summary>${ Object.entries(value).map((e) => variableToHtml(e[0], e[1], 1)).join('') }}</details>`;
				}
			}
		} else {
			// Literal
			return `<span class="identifier ind-${ indent }">${ key }</span>=<span class="value">"${ value }"</span>,<br/>`
		}
	}

	function arrayToHtml(tree: unknown[], indent: number): string {
		return `<details open class="ind-${ indent }"><summary>[<span class="show-on-hide">...}</summary>${ tree.map((e) => treeToHtmlInternal(e, 1)).join('') }]</details>`;
	}

	function valueToHtml(tree: unknown, indent: number): string {
		return `<span class="ind-${ indent } value">"${ tree }"</span><br/>`;
	}

	function treeToHtmlInternal(tree: any, indent: number): string {
		if (typeof (tree) === 'object') {
			if (Array.isArray(tree)) return arrayToHtml(tree, indent);
			else return objectToHtml(tree, indent);
		} else {
			return valueToHtml(tree, indent);
		}
	}

	return treeToHtmlInternal(tree, indent);
}


export function JSONFormatter() {
	const [value, setValue] = useParamState('v');
	const [searchTerm, setSearchTerm] = useParamState('s');

	const asJson = tryJsonParse(value);
	const searchResult = asJson === null || searchTerm.trim().length === 0 ? null : tryJq(asJson, searchTerm);
	const realValue = searchResult === null ? value : searchResult;
	const parser = searchResult === null ? JSON.parse : ((a: string) => a);

	return (
		<div class="log-formatter">
			<InputPane value={ value } setValue={ setValue } requestFocus={ true }/>
			<div class="right">
				<RenderingPane parser={ parser } renderer={ jsonToHTML } content={ realValue }/>
				<SearchBar setValue={ setSearchTerm } value={ searchTerm }/>
			</div>
		</div>
	)
}
