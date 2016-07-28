
type Channel = {
  isClosed: bool,
  args: Array<any>,
  opts: Object,
  takes: Array<Action>,
  xduce: ?Object,
  buffer: Buffer,
  then: (a: Function, b: Function) => Promise<any>
}

type Action = {
  payload: any,
  resolve: (payload: any) => void,
  promise: Promise<any>
}

type Buffer = {
  unreleased?: Array<Action>,
  released?: Array<Action>,
  push: (a: Action) => void,
  shift: () => ?Action,
  isEmpty: () => number
}

type BufferConfig = Buffer | number
