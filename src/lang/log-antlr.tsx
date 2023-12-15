import { useParamState, useRequireWindowFunction } from "../utils.tsx";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";

type Var = {
	$type: "var",
	Identifier: string,
	Value: Value,
}
type Class = {
	$type: "class"
	Identifier: string,
	Vars: Var[],
};
type Url = {
	$type: "url"
} & string;
type Optional = {
	$type: "optional",
	Value: Value,
}
type Value = Class | Url | string | {} | never[] | Value[] | Optional | null;

function Interpret(s: string): Class | Error {
	// @ts-ignore
	const result = logAntlr(s);
	if ('Error' in result && typeof (result.Error) === 'string') {
		return new Error(result.Error);
	}

	// @ts-ignore
	return InterpretVar(result);
}

function keys(obj: any, ...s: string[]): boolean {
	for (let string of s) {
		if (!(string in obj)) return false;
	}
	if (Object.keys(obj).length !== s.length) {
		return false;
	}
	return true;
}

function InterpretVar(result: any): Value {
	if (result === undefined) {
		throw new Error('Invalid call');
	}
	if (keys(result, 'Identifier', 'Vars')) {
		return {
			$type: "class",
			Identifier: result.Identifier,
			Vars: result.Vars.map((e: any) => InterpretVar(e)),
		} satisfies Class;
	} else if (keys(result, 'Content')) {
		return Object.assign(result.Content, {
			$type: 'url',
		}) satisfies Url;
	} else if (keys(result, 'Identifier', 'Value')) {
		return {
			$type: "var",
			Identifier: result.Identifier,
			Value: InterpretVar(result.Value),
		} satisfies Var;
	} else {
		if (result.EmptyObject === true) {
			return {};
		}
		if (result.EmptyArray === true) {
			return [];
		}
		if (result.Url) {
			return InterpretVar(result.Url);
		}
		if (result.Class) {
			return InterpretVar(result.Class);
		}
		if (result.String) {
			return result.String;
		}
		if (result.Classes) {
			return result.Classes.map((e: any) => InterpretVar(e));
		}
		if (result.Optional) {
			return {
				$type: 'optional',
				Value: InterpretVar(result.Optional),
			} satisfies Optional;
		}
		return null;
	}
}

function rendererInline(entity: Url | string | {} | Optional | null) {
	if (typeof (entity) === 'string') {
		return `<span class="ind-${ 0 } value">"${ entity }"</span><br/>`;
	}
}

function renderClass(entity: Class, indent: number = 0, skipDetails = false, omitWrapper = false): string {
	if (skipDetails) {
		if (omitWrapper) {
			return (entity.Vars ?? []).map((e) => renderer(e, indent + 1)).join('');
		} else {
			return `<span class="identifier ind-${ indent } class">${ entity.Identifier }</span>{<br/>${ (entity.Vars ?? []).map((e) => renderer(e, indent + 1)).join('') }}`;
		}
	} else {
		if (omitWrapper) {
			throw new Error('Cannot omit name in a details element')
		} else {
			return `<details open class="ind-${ indent }"><summary><span class="identifier class">${ entity.Identifier }</span>{<span class="show-on-hide">...}</summary>${ (entity.Vars ?? []).map((e) => renderer(e, 1)).join('') }}</details>`;
		}
	}
}

function isNumeric(s: string) {
	return /^[0-9]+$/.test(s);
}

function isBoolean(s: string) {
	return /^(true|false)$/i.test(s);
}

function renderer(entity: Class | Var, indent: number = 0): string {
	if (entity.$type === "class") {
		return renderClass(entity, indent);
	} else {
		if (Array.isArray(entity.Value)) {
			if (entity.Value.length === 0) {
				return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=[],<br/>`;
			}
			return `<details open class="ind-${ indent }"><summary><span class="identifier">${ entity.Identifier }</span>=[<span class="show-on-hide">...]</span></summary>${ entity.Value.map((e) => renderer(e, 1)).join('') }]</details>`;
		} else {
			if (typeof (entity.Value) === "string") {
				if (isNumeric(entity.Value)) {
					return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=<span class="value type-number">"${ entity.Value }"</span>,<br/>`
				} else if (isBoolean(entity.Value)) {
					return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=<span class="value type-boolean">"${ entity.Value }"</span>,<br/>`
				} else {
					return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=<span class="value type-string">"${ entity.Value }"</span>,<br/>`
				}
			} else if (typeof (entity.Value) === 'object' && entity.Value !== null) {
				if (Object.keys(entity.Value).length === 0) {
					return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=\{\},<br/>`;
				} else if ('$type' in entity.Value) {
					if (entity.Value.$type === 'class') {
						return `<details open class="ind-${ indent }"><summary><span class="identifier">${ entity.Identifier }</span>=<span class="class">${ entity.Value.Identifier }</span>{<span class="show-on-hide">...}</span></summary>${ renderClass(entity.Value, 0, true, true) }}</details>`
					} else {
						return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=${ rendererInline(entity.Value) }<br/>`;
					}
				} else {
					console.error('Whoops');
					throw new Error('invalid');
				}
			} else {
				return `<span class="identifier ind-${ indent }">${ entity.Identifier }</span>=null<br/>`;
			}
		}
	}
}

export function LogAntlrFormatter() {
	const [value, setValue] = useParamState('v', true)
	useRequireWindowFunction('logAntlr');

	const parser = (a: string) => {
		if (!('logAntlr' in window)) return 'Waiting for parser to be available...';
		return Interpret(a);
	}
	const render = (a: Class | Error | string) => {
		if (typeof (a) === 'string') {
			return a;
		} else if (a instanceof Error) {
			return `Invalid content: ${ a.message }`;
		} else {
			return renderer(a, 0);
		}
	};

	return (
		<div class="log-formatter">
			<InputPane value={ value } setValue={ setValue } requestFocus/>
			<div class="right">
				<RenderingPane content={ value } parser={ parser } renderer={ render }/>
			</div>
		</div>
	)
}
