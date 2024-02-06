export interface StateProvider<STATE> {
	get: () => STATE;
	set: (value: STATE) => void;
}
