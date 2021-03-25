# Stress Test Tool

The stress test tool is mostly for debug and development of netidx
itself. The stress publisher publishes a configurably sized table, and
updates each value after a configurable timeout. The stress subscriber
subscribes to every value in the table published by the stress
publisher, and prints throughput statistics to stdout.

