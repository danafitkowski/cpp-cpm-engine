# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Critical Path Partners
"""Frozen Python reference implementation for cpm-engine cross-validation.

See python_reference/README.md for provenance, SHA-256 pinning, and usage notes.
The only public surface consumed by cpm-engine.crossval.js is:

    from cpm import compute_cpm, date_to_num
"""
from .cpm import (
    compute_cpm,
    date_to_num,
    num_to_date,
    add_work_days,
    subtract_work_days,
    ENGINE_VERSION,
)

__all__ = [
    'compute_cpm',
    'date_to_num',
    'num_to_date',
    'add_work_days',
    'subtract_work_days',
    'ENGINE_VERSION',
]
