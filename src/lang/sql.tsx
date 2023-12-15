import { useParamState } from "../utils.tsx";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";
import { format } from "sql-formatter";
import hljs from 'highlight.js';

export function SQLFormatter() {
	const [value, setValue] = useParamState('v', true);

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
					}), { language: 'sql' }).value }</code></pre>`
				) } content={ value }/>
			</div>
		</div>
	)
}
