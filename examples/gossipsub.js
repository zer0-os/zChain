import Gossipsub from'libp2p-gossipsub';

const gsub = new Gossipsub(libp2p, options)

await gsub.start()

gsub.on('fruit', (data) => {
  console.log(data)
})
gsub.subscribe('fruit')

gsub.publish('fruit', new TextEncoder().encode('banana'))