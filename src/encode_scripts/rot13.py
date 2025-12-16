# Name: ROT13
# Description: Caesar cipher with shift of 13
# Avatar: 🔄

import codecs

def encode(text):
    return codecs.encode(text, 'rot_13')

def decode(text):
    return codecs.decode(text, 'rot_13')
