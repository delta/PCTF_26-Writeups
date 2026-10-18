package shared

var proofFns = []func(uint32, uint32, uint32) uint32{
	proofMixA,
	proofMixB,
	proofMixC,
	proofMixD,
}

func UpdateProof(cell int, proof, proofSeed uint32) uint32 {
	x := uint32(cell + 1)

	idx := (proof ^ (x * 17) ^ (proofSeed >> 3)) & 3

	proof = proofFns[idx](proof, x, proofSeed)

	proof ^= (proofSeed + x*1337)
	proof = (proof << 5) | (proof >> 27)

	return proof
}

func proofMixA(p, x, seed uint32) uint32 {
	v := p ^ (x + 0x9E3779B9)
	v *= 0x85EBCA6B
	v ^= v >> 13
	return v
}

func proofMixB(p, x, seed uint32) uint32 {
	v := p + (x * 0x27D4EB2D)
	v ^= v << 7
	v *= 0xC2B2AE35
	return v
}

func proofMixC(p, x, seed uint32) uint32 {
	v := (p ^ (x + seed)) * 0x165667B1
	v ^= v >> 11
	return v
}

func proofMixD(p, x, seed uint32) uint32 {
	v := p + (x ^ 0xDEADBEEF)
	v *= 0x7FEB352D
	v ^= v >> 15
	return v
}
