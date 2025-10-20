import {EventEmitter} from 'events'

const emitter = new EventEmitter()

const Bus = {
  pub: (topic, data) => emitter.emit(topic, data),
  sub: (topic, handler) => emitter.on(topic, handler),
  unsub: (topic, handler) => emitter.off(topic, handler),
  clear: () => emitter.removeAllListeners(),
}

export default Bus
