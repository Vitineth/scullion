import { useParamState } from "../utils.tsx";
import { useEffect, useState } from "preact/hooks";
import hljs from "highlight.js";
import { InputPane } from "../components/input-pane.tsx";
import { RenderingPane } from "../components/rendering-pane.tsx";

export function PromQLFormatter() {
	const [value, setValue] = useParamState('v');
	const [_, setForceRerender] = useState(false);

	const renderer = (s: string) => {
		if ((window as any).prettify === undefined) return "<p>The MetricsQL formatter hasn't loaded yet</p>";
		const formatted = (window as any).prettify(s);
		return formatted === null ? '<p>Invalid MetricsQL</p>' : `<pre class="clear"<code>${ hljs.highlight(formatted, { language: 'promql' }).value }</code></pre>`;
	}

	useEffect(() => {
		if (!hljs.listLanguages().includes('promql')) {
			hljs.registerLanguage(
				"promql",
				() => ({
					case_insensitive: true,
					keywords: 'with median offset @ rate atan2 and or unless on ignoring group_left group_right sum min max avg group stddev stdvar count count_values bottomk topk quantile by',
					contains: [
						hljs.QUOTE_STRING_MODE,
						hljs.NUMBER_MODE,
					],
				}),
			);
			setForceRerender((v) => !v);
		}

		if ((window as any).prettify) return;

		const interval = setInterval(() => {
			if ((window as any).prettify) {
				clearInterval(interval);
				setForceRerender((v) => !v);
			}
		}, 100);
		return () => clearInterval(interval);
	}, []);


	return (
		<div class="log-formatter">
			<InputPane value={ value } setValue={ setValue } requestFocus/>
			<div class="right">
				<RenderingPane parser={ (a) => a } renderer={ renderer } content={ value }/>
			</div>
		</div>
	)
}
