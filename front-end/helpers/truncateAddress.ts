const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/

const truncateAddress = (address: string) => {
  const segments = address.match(truncateRegex)
  if (!segments) return address
  return `${segments[1]}…${segments[2]}`
}

export default truncateAddress
