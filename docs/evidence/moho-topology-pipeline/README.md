# Declarative Topology Pipeline

This evidence bundle proves that an LLM-style description of a
non-standard rig (tail, wings, cape, six fingers, horns, compound
topologies) compiles into a real Moho .moho that opens, saves and
reopens in the installed Moho 14.4.

| Case | Bones | Moho bytes | sha256 |
|------|------:|-----------:|--------|
| default_biped | 15 | 35091 | 0f94d1b5eaa1ad64… |
| with_tail | 21 | 35585 | 233f71d74e58f50a… |
| with_wings | 23 | 35646 | 3f60c013538ac7c6… |
| with_cape | 19 | 35439 | 44438640d8df6c5c… |
| with_six_fingers | 17 | 35217 | 07d1b05bb36bde61… |
| compound | 29 | 36090 | b6ad507594a98227… |

Each  is the TopologySpec that was fed to the compiler;
 is the humanoid manifest read back from the
emitted .moho. The two should be consistent.
