import { useParamState, useRequireHljsLanguage } from "../utils.tsx";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";
import { format } from "sql-formatter";
import hljs from 'highlight.js';

export function SQLFormatter() {
	const [value, setValue] = useParamState('v', true);
	const sql = hljs.getLanguage('sql')!;
	useRequireHljsLanguage('sql-custom', {
		// SQL is always around so this should be safe (fingers crossed)
		...sql,
		contains: [
			...sql.contains,
			{
				className: 'variable',
				begin: /\$\w+/,
			},
			{
				className: 'variable',
				begin: /:\w+/,
			}
		]
	})

	return (
		<div class="log-formatter">
			<InputPane value={ value } setValue={ setValue } requestFocus/>
			<div class="right">
				<RenderingPane parser={ (a) => a } renderer={ (a) => (
					`<pre><code>${ hljs.highlight(format(a, {
						paramTypes: {
							custom: [
								{
									regex: ':\\w+',
								},
								{
									regex: '\\$\\w+',
								},
							],
						},
					}), { language: 'sql-custom' }).value }</code></pre>`
				) } content={ value }/>
			</div>
		</div>
	)
}
