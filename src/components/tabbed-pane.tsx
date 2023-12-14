import { useEffect } from "preact/hooks";
import { PropsWithChildren } from "preact/compat";
import { useParamState } from "../utils.tsx";

// @ts-ignore
export function Tab(props: PropsWithChildren & { id: string, title: string, keybind: string }) {
	return (<></>);
}

export function FallbackTab(props: {
	keybinds: Record<string, string>,
	trigger: (v: string) => void,
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (Object.hasOwn(props.keybinds, e.key)) {
				props.trigger(props.keybinds[e.key]);
			}
		}
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	})
	return (
		<div/>
	);
}

export function TabbedPane(props: PropsWithChildren) {
	const [selected, setSelected] = useParamState('pane');
	const children = Array.isArray(props.children) ? props.children : [props.children];

	const childrenById: Record<string, any> = {};
	const childrenTitlesById: Record<string, string> = {};
	const keybinds: Record<string, string> = {};
	children.forEach((e) => {
		if (typeof (e) === 'object' && 'props' in e && 'id' in e.props) {
			childrenById[e.props.id] = e;
			if ('keybind' in e.props) {
				keybinds[e.props.keybind] = e.props.id;
			}
			if ('title' in e.props) {
				childrenTitlesById[e.props.id] = e.props.title;
			}
		}
	});

	let child = childrenById[selected]?.props?.children ?? (
		<FallbackTab keybinds={ keybinds } trigger={ setSelected }/>);
	return (
		<div class="tabbed-pane">
			<div class="tabs">
				{ Object.entries(childrenTitlesById).map((e) => (
					<div key={ e[0] } class={ `tab ${ e[0] === selected ? 'active' : '' }` }
						 onClick={ () => setSelected(e[0]) }>{ e[1] }</div>
				)) }
			</div>
			{ child }
		</div>
	)


}
