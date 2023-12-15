import { useParamState, useRequireHljsLanguage, useRequireWindowFunction } from "../utils.tsx";
import hljs from "highlight.js";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";

export function PromQLFormatter() {
	const [value, setValue] = useParamState('v', true);
	useRequireWindowFunction('prettify');
	useRequireHljsLanguage('promql', {
		case_insensitive: true,
		keywords: 'with median offset @ rate atan2 and or unless on ignoring group_left group_right sum min max avg group stddev stdvar count count_values bottomk topk quantile by',
		contains: [
			hljs.QUOTE_STRING_MODE,
			hljs.NUMBER_MODE,
		],
	})

	const renderer = (s: string) => {
		if ((window as any).prettify === undefined) return "<p>The MetricsQL formatter hasn't loaded yet</p>";
		const formatted = (window as any).prettify(s);
		return formatted === null ? '<p>Invalid MetricsQL</p>' : `<pre class="clear"<code>${ hljs.highlight(formatted, { language: 'promql' }).value }</code></pre>`;
	}

	return (
		<div class="log-formatter">
			<InputPane value={ value } setValue={ setValue } requestFocus/>
			<div class="right">
				<RenderingPane parser={ (a) => a } renderer={ renderer } content={ value }/>
			</div>
		</div>
	)
}
