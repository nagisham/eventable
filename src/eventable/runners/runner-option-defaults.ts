export function forward_params_as_args(...params: unknown[]) {
	return params as unknown;
}

export function forward_args_as_return(args: unknown) {
	return args;
}

export function run_handler_middleware(
	handle: (args: unknown, api?: unknown) => void,
	args: unknown,
	api?: unknown,
) {
	handle(args, api);
}
