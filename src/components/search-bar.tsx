import { debounce } from "../utils.tsx";

export function SearchBar(props: {
	setValue: (v: string) => void,
	value: string,
}) {
	const debouncedInput = debounce(props.setValue, 300);
	return (
		<input class="search" placeholder="JQ Search ($.actions)" value={ props.value } onInput={ (v) => {
			if (v.target && v.target instanceof HTMLInputElement) debouncedInput(v.target.value)
		} }/>
	)
}
