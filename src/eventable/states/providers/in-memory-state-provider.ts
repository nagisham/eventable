import { StateProvider } from "./types";

export function in_memory_state_provider<STATE>(ininial: STATE): StateProvider<STATE> {
	const state = { current: ininial };

	const get = () => {
		return state.current;
	};

	const set = (value: STATE) => {
		state.current = value;
	};

	return { get, set };
}
