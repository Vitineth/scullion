import { useEffect, useState } from "preact/hooks";
import { decompressFromEncodedURIComponent, compressToEncodedURIComponent } from 'lz-string'

function getActiveParams(){
	return window
		.location
		.hash
		.substring(1)
		.split('&')
		.filter((e) => e.length > 0 && e.includes('='))
		.map((e) => [
			decodeURIComponent(e.substring(0, e.indexOf('='))),
			decodeURIComponent(e.substring(e.indexOf('=') + 1)),
		])
		.reduce((res, item) => ({
			...res,
			[item[0]]: item[1],
		}), {} satisfies Record<string, string>);
}

export function useParams() {
	const params: Record<string, string> = getActiveParams();

	const set = (params: Record<string, string>) => {
		window.location.hash = Object
			.entries(params)
			.map(([key, value]) => [
				encodeURIComponent(key),
				encodeURIComponent(value),
			])
			.map(([key, value]) => `${ key }=${ value }`)
			.join('&');
	}
	const update = (key: string, value: string) => {
		set({
			...getActiveParams(),
			[key]: value,
		});
	}

	return Object.assign({ set, update}, params);
}

export function useParamState(key: string, encoded: boolean = false): [string, (v: string) => void] {
	if (key === 'set') throw new Error('Invalid key: "set" is reserved');

	const [s, setS] = useState(deriveFromParameters(key, '', encoded));
	const setter = setWithParamHistory(key, setS, encoded);
	return [s, setter];
}

export function deriveFromParameters(key: string, fallback: string = '', encoded: boolean = false): string {
	if (key === 'set') throw new Error('Invalid key: "set" is reserved');

	const params = useParams();
	if (!(key in params)) return fallback;
	const value = params[key];
	if (value === null || value === undefined) return fallback;
	return encoded ? decompressFromEncodedURIComponent(value) : value;
}

export function setWithParamHistory(key: string, setter: (v: string) => unknown, encoded: boolean = false) {
	if (key === 'set') throw new Error('Invalid key: "set" is reserved');

	return (v: string) => {
		// Despite this being named as a hook it does not need to be called in order
		const params = useParams();
		params.update(key, encoded ? compressToEncodedURIComponent(v) : v);
		setter(v);
	}
}

export function debounce(func: Function, wait: number, options?: {
	leading: boolean,
	maxWait: number,
}) {
	let lastArgs: any;
	let lastThis: any;
	let maxWait: number = 0;
	let result: any;
	let timerId: number | undefined;
	let lastCallTime: number | undefined;

	let lastInvokeTime = 0
	let leading = false
	let maxing = false
	let trailing = true

	// Bypass `requestAnimationFrame` by explicitly setting `wait=0`.
	const useRAF = (!wait && wait !== 0 && typeof requestAnimationFrame === 'function')

	if (typeof func !== 'function') {
		throw new TypeError('Expected a function')
	}
	wait = +wait || 0
	if (typeof (options) === 'object') {
		leading = !!options.leading
		maxing = 'maxWait' in options
		maxWait = maxing ? Math.max(+options.maxWait || 0, wait) : (maxWait ?? 0)
		trailing = 'trailing' in options ? !!options.trailing : trailing
	}

	function invokeFunc(time: number) {
		const args = lastArgs
		const thisArg = lastThis

		lastArgs = lastThis = undefined
		lastInvokeTime = time
		result = func.apply(thisArg, args)
		return result
	}

	function startTimer(pendingFunc: FrameRequestCallback, wait: number) {
		if (useRAF) {
			if (timerId) {
				cancelAnimationFrame(timerId)
			}
			return requestAnimationFrame(pendingFunc)
		}
		return setTimeout(pendingFunc, wait)
	}

	function cancelTimer(id: number) {
		if (useRAF) {
			return cancelAnimationFrame(id)
		}
		clearTimeout(id)
	}

	function leadingEdge(time: number) {
		// Reset any `maxWait` timer.
		lastInvokeTime = time
		// Start the timer for the trailing edge.
		timerId = startTimer(timerExpired, wait)
		// Invoke the leading edge.
		return leading ? invokeFunc(time) : result
	}

	function remainingWait(time: number) {
		const timeSinceLastCall = time - (lastCallTime ?? 0)
		const timeSinceLastInvoke = time - lastInvokeTime
		const timeWaiting = wait - timeSinceLastCall

		return maxing
			? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
			: timeWaiting
	}

	function shouldInvoke(time: number) {
		const timeSinceLastCall = time - (lastCallTime ?? 0)
		const timeSinceLastInvoke = time - lastInvokeTime

		// Either this is the first call, activity has stopped and we're at the
		// trailing edge, the system time has gone backwards and we're treating
		// it as the trailing edge, or we've hit the `maxWait` limit.
		return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
			(timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait))
	}

	function timerExpired() {
		const time = Date.now()
		if (shouldInvoke(time)) {
			return trailingEdge(time)
		}
		// Restart the timer.
		timerId = startTimer(timerExpired, remainingWait(time))
	}

	function trailingEdge(time: number) {
		timerId = undefined

		// Only invoke if we have `lastArgs` which means `func` has been
		// debounced at least once.
		if (trailing && lastArgs) {
			return invokeFunc(time)
		}
		lastArgs = lastThis = undefined
		return result
	}

	function cancel() {
		if (timerId !== undefined) {
			cancelTimer(timerId)
		}
		lastInvokeTime = 0
		lastArgs = lastCallTime = lastThis = timerId = undefined
	}

	function flush() {
		return timerId === undefined ? result : trailingEdge(Date.now())
	}

	function pending() {
		return timerId !== undefined
	}

	function debounced(...args: any[]) {
		const time = Date.now()
		const isInvoking = shouldInvoke(time)

		lastArgs = args
		// @ts-ignore
		lastThis = this
		lastCallTime = time

		if (isInvoking) {
			if (timerId === undefined) {
				return leadingEdge(lastCallTime)
			}
			if (maxing) {
				// Handle invocations in a tight loop.
				timerId = startTimer(timerExpired, wait)
				return invokeFunc(lastCallTime)
			}
		}
		if (timerId === undefined) {
			timerId = startTimer(timerExpired, wait)
		}
		return result
	}

	debounced.cancel = cancel
	debounced.flush = flush
	debounced.pending = pending
	return debounced
}

export function useRequireWindowFunction(method: string) {
	const [, setForceRerender] = useState(false);

	useEffect(() => {
		const exists = () => method in (window as any) && typeof ((window as any)[method]) === 'function';
		if (exists()) return;

		let interval: number | undefined = setInterval(() => {
			if (exists()) {
				clearInterval(interval);
				interval = undefined;
				setForceRerender((v) => !v);
			}
		}, 100);

		return () => {
			if (interval !== undefined) clearInterval(interval);
		}
	}, []);
}
