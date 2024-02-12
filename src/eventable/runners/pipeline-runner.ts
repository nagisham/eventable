import {
	forward_args_as_return,
	forward_params_as_args,
	run_handler_midleware,
} from "./runner-option-defaults";

export interface PipelineApi {
	readonly aborted: boolean;
	abort: () => void;
}

function pipeline_api(): PipelineApi {
	let aborted = false;

	return {
		get aborted() {
			return aborted;
		},
		abort: () => {
			aborted = true;
		},
	};
}

interface PipelineRunnerOptions<
	STATE,
	API,
	RETURNS extends { [KEY in keyof STATE]: any },
	PARAMS extends any[] = [args: STATE[keyof STATE]],
> {
	request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
	response?: (<TYPE extends keyof STATE>(args: STATE[TYPE]) => RETURNS[TYPE]) | undefined;
	midleware?:
		| (<TYPE extends keyof STATE>(
				handler: (args: STATE[TYPE], API: API) => void,
				arg: STATE[TYPE],
				api: API,
		  ) => void)
		| undefined;
}

export function pipeline_runner<
	STATE,
	PARAMS extends any[],
	RETURNS extends { [KEY in keyof STATE]: any } = STATE,
>(options?: PipelineRunnerOptions<STATE, PipelineApi, RETURNS, PARAMS>) {
	const { request, response, midleware } = Object.assign(
		{
			request: forward_params_as_args,
			response: forward_args_as_return,
			midleware: run_handler_midleware,
		},
		options,
	);

	return <TYPE extends keyof STATE>(
		handlers: Array<(args: STATE[TYPE], api: PipelineApi) => void>,
		...params: PARAMS
	) => {
		const args = request<TYPE>(...params);
		const api = pipeline_api();

		for (const handler of handlers) {
			if (api.aborted) break;
			midleware(handler, args, api);
		}

		return response<TYPE>(args);
	};
}
