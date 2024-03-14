import { forward_params_as_args, run_handler_middleware } from "./runner-option-defaults";

interface EventRunnerOptions<STATE, PARAMS extends any[] = []> {
	request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
	midleware?:
		| (<TYPE extends keyof STATE>(handler: (args: STATE[TYPE]) => void, arg: STATE[TYPE]) => void)
		| undefined;
}

export function event_runner<STATE, PARAMS extends any[]>(
	options?: EventRunnerOptions<STATE, PARAMS>,
) {
	const { request, midleware } = Object.assign(
		{
			request: forward_params_as_args,
			midleware: run_handler_middleware,
		},
		options,
	);

	type RETURNS = { [KEY in keyof STATE]: void };

	return <TYPE extends keyof STATE>(
		handlers: Array<(args: STATE[TYPE], api: void) => void>,
		...params: PARAMS
	): RETURNS[TYPE] => {
		return handlers.forEach((handler) => midleware(handler, request<TYPE>(...params)));
	};
}
