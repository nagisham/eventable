import { Lambda } from "@nagisham/standard";

export type HandlersState<STATE, API = void> = {
	[TYPE in keyof STATE]: Array<(args: STATE[TYPE], api: API) => void>;
};

export type Type = string | number | symbol;

export type Events = Record<Type, any>;

export type empty = void | undefined | null;

export type Cleanup = () => void;

type RegisterTypeOption<TYPE> = {
	type: TYPE;
};

type RegisterSelectorOption<ARGS, SELECTED> = ARGS extends empty
	? { select?: never }
	: { select?: (args: ARGS) => SELECTED };

type HandleOption<ARGS, API = void> = API extends empty
	?
			| Lambda<[...params: ARGS extends empty ? [] : [args: ARGS]], void>
			| {
					mode?: "once" | "each";
					name?: string;
					handle: Lambda<[...params: ARGS extends empty ? [] : [args: ARGS]], void>;
			  }
	:
			| Lambda<[args: ARGS, api: API], void>
			| {
					mode?: "once" | "each";
					name?: string;
					handle: Lambda<[args: ARGS, api: API], void>;
			  };

type RegisterHandlerOptions<ARGS, API = void> = {
	handler: HandleOption<ARGS, API>;
};

type RegisterSpotOptions = {
	patch?:
		| { mode?: never; name?: never }
		| { mode: "prepend" | "append" }
		| { mode: "before" | "after" | "instead"; name: string };
};

export type RegisterOptions<TYPE, API, ARGS, SELECTED = ARGS> = RegisterTypeOption<TYPE> &
	RegisterSelectorOption<ARGS, SELECTED> &
	RegisterSpotOptions &
	RegisterHandlerOptions<SELECTED, API>;

export type RegisterTypelessOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<
	ARGS,
	SELECTED
> &
	RegisterSpotOptions &
	RegisterHandlerOptions<SELECTED, API>;
