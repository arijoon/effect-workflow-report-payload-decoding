import {
  ClusterWorkflowEngine,
  MessageStorage,
  Runners,
  Sharding,
  ShardingConfig,
  ShardManager,
  ShardStorage,
} from "@effect/cluster";
import { NodeRuntime } from "@effect/platform-node";
import { Workflow } from "@effect/workflow";
import { Effect, Layer, PrimaryKey, Schema } from "effect";

export const TestShardingConfig = ShardingConfig.layer({
  shardsPerGroup: 300,
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100,
});

export const TestWorkflowEngine = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(ShardManager.layerClientLocal),
  Layer.provide(ShardStorage.layerMemory),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provideMerge(TestShardingConfig),
);

export class Payload extends Schema.Class<Payload>("Payload")({
  id1: Schema.String,
  id2: Schema.String,
}) implements PrimaryKey.PrimaryKey {
  [PrimaryKey.symbol]() {
    return `${this.id1}-${this.id2}`;
  }
}

const MyWorkflow = Workflow.make({
  name: "MyWorkflow",
  payload: Payload,
  success: Schema.Void,
  error: Schema.String,
  idempotencyKey: PrimaryKey.value,
});

const MyWorkflowLive = MyWorkflow.toLayer(Effect.fn(function*(payload) {
  const key = payload[PrimaryKey.symbol]();
  if (payload instanceof Payload) {
    return yield* Effect.void;
  }

  return yield* Effect.fail(
    `Invalid payload to have primary key "${PrimaryKey.value(Payload.make(payload))}", got "${key}"`,
  );
}));

const allDeps = MyWorkflowLive.pipe(
  Layer.provideMerge(TestWorkflowEngine),
);

const program = Effect.gen(function*() {
  yield* MyWorkflow.execute(Payload.make({ id1: "firstId", id2: "secondId" }));
});

NodeRuntime.runMain(program.pipe(
  Effect.provide(allDeps),
));
