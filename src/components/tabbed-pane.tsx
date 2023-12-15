import { useEffect } from "preact/hooks";
import { PropsWithChildren } from "preact/compat";
import { useParamState } from "../utils.tsx";

// @ts-ignore
export function Tab(props: PropsWithChildren & { id: string, title: string, keybind: string, localStorageGate?: string, gateInverted?: boolean }) {
	return (<></>);
}

export function FallbackTab(props: {
	keybinds: Record<string, {id: string, name: string}>,
	trigger: (v: string) => void,
}) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (Object.hasOwn(props.keybinds, e.key)) {
				props.trigger(props.keybinds[e.key].id);
			}
		}
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	})

	return (
		<div class="fallback">
			<div>
				{ Object.entries(props.keybinds).map(([k, id]) => (<div key={id.id}><code>{ k }</code> - { id.name }</div>)) }
			</div>
		</div>
	);
}

export function TabbedPane(props: PropsWithChildren) {
	const [selected, setSelected] = useParamState('pane');
	const children = Array.isArray(props.children) ? props.children : [props.children];

	const childrenById: Record<string, any> = {};
	const childrenTitlesById: Record<string, string> = {};
	const keybinds: Record<string, {id: string, name: string}> = {};
	children
		.filter((e) => {
			if (typeof (e) === 'object' && 'props' in e) {
				if ('localStorageGate' in e.props) {
					const invertedTruth = !('gateInverted' in e.props && e.props.gateInverted === true);
					if (localStorage.getItem(e.props.localStorageGate) === null) {
						return !invertedTruth;
					} else {
						return invertedTruth;
					}
				} else {
					return true;
				}
			} else {
				return false;
			}
		})
		.forEach((e) => {
			if (typeof (e) === 'object' && 'props' in e && 'id' in e.props) {
				childrenById[e.props.id] = e;
				if ('keybind' in e.props) {
					keybinds[e.props.keybind] = {id: e.props.id, name: e.props.title ?? e.props.id};
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
