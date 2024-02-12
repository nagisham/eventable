import { Lambda } from "@nagisham/standard";
import { PipelineApi } from "src/eventable/runners";

export interface PipelineOptions<STATE, PARAMS extends any[], RETURN> {
	request?: ((...params: PARAMS) => STATE) | undefined;
	response?: ((args: STATE) => RETURN) | undefined;
	midleware?:
		| ((handler: (args: STATE, API: PipelineApi) => void, arg: STATE, api: PipelineApi) => void)
		| undefined;
	handlers?: Array<Lambda<[args: STATE, api: PipelineApi], void>>;
}
