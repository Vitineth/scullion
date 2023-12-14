
export function RenderingPane<T>(props: {
	content?: string,
	parser: (content: string) => T,
	renderer: (ast: T) => string,
}) {
	if (props.content) {
		try {
			const parsed = props.parser(props.content);
			const rendered = props.renderer(parsed);
			const element = {
				__html: rendered,
			};

			return (
				<div class="target" dangerouslySetInnerHTML={ element }/>
			);
		} catch (e) {
			console.debug(e);
			if (e instanceof Error) {
				return (
					<div class="target">Failed to render: { e.message }</div>
				);
			} else {
				return (
					<div className="target">Failed to render: An unknown error occurred</div>
				);
			}
		}
	} else {
		return (
			<div class="target"></div>
		);
	}
}
