export type HandlersState<STATE, API = any> = {
	[TYPE in keyof STATE]?: Array<(args: STATE[TYPE], api: API) => void>;
};
