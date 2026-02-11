#!/usr/bin/env python3

KEY = b"THIS_IS_AES_KEY!"
ROUNDS_BLOCK1 = 7
ROUNDS_BLOCK2 = 10


def xor_block(a, b):
    return bytes(x ^ y for x, y in zip(a, b))


def inv_permute(block):
    # inverse of: block[4:] + block[:4]
    return block[-4:] + block[:-4]


def reverse_rounds(state, rounds):
    for _ in range(rounds):
        state = inv_permute(state)
        state = xor_block(state, KEY)
    return state


def main():
    # read artifacts
    with open("state_round7.bin", "rb") as f:
        state1 = f.read()

    with open("output.bin", "rb") as f:
        state2 = f.read()

    # reverse transformations
    block1 = reverse_rounds(state1, ROUNDS_BLOCK1)
    block2 = reverse_rounds(state2, ROUNDS_BLOCK2)

    # remove padding (X|O)
    block2 = block2.rstrip(b"X|O")

    flag = block1 + block2
    print(flag.decode())


if __name__ == "__main__":
    main()
