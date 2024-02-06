import { Type } from "../types";

import { StateProvider } from "./providers/types";
import { HandlersState } from "./types";

interface State<STATE, API = any> {
	get: <TYPE extends keyof STATE>(type: TYPE) => Array<(args: STATE[TYPE], api: API) => void>;
	set: <TYPE extends keyof STATE>(
		type: TYPE,
		handlers: Array<(args: STATE[TYPE], api: API) => void>,
	) => void;
}

export function handlers_state<STATE, API>(
	default_type: Type | undefined,
	provider: StateProvider<HandlersState<STATE, API>>,
): State<STATE> {
	const get = <TYPE extends keyof STATE>(type: TYPE) => {
		const key = (default_type ?? type ?? "default") as TYPE;
		return (provider.get()[key] ??= []);
	};

	const set = <TYPE extends keyof STATE>(
		type: TYPE,
		handlers: Array<(args: STATE[TYPE], api: any) => void>,
	) => {
		const key = (default_type ?? type ?? "default") as TYPE;
		const state = provider.get();
		state[key] = handlers;
		provider.set(state);
	};

	return { get, set };
}
