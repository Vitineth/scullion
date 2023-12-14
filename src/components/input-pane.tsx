import { useEffect, useRef } from "preact/hooks";

export function InputPane(props: {
	value: string,
	setValue: (v: string) => void,
	requestFocus?: boolean,
}) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		if (props.requestFocus && ref.current !== null) {
			ref.current.focus();
		}
	}, [ref, ref.current]);

	return (
		<textarea
			ref={ ref }
			onInput={ (e) => {
				if (e.target && e.target instanceof HTMLTextAreaElement)
					props.setValue(e.target.value)
			} }
		>
			{ props.value }
		</textarea>
	);
}
