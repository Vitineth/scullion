declare module 'htmldiff-js' {
	interface HTMLDiff {
		execute(a: string, b: string): string;
	}

	const exp: HTMLDiff;

	export default exp;
}
