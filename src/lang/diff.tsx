import { useParamState } from "../utils.tsx";
import { InputPane } from "../components/input-pane.tsx";
import htdiff from 'htmldiff-js';

export function DiffPane() {
	const [leftValue, setLeftValue] = useParamState('lv', true);
	const [rightValue, setRightValue] = useParamState('rv', true);


	return (
		<div class="log-formatter diff">
			<InputPane value={ leftValue } setValue={ setLeftValue } requestFocus/>
			<div class="center" dangerouslySetInnerHTML={ { __html: htdiff.execute(leftValue, rightValue) } }/>
			<InputPane value={ rightValue } setValue={ setRightValue }/>
		</div>
	)
}
