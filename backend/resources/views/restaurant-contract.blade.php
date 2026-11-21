<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>{{ $contract->contract_number }}</title>
<style>
body { font: 15px system-ui; color: #202520; margin: 2rem auto; max-width: 46rem; padding: 1rem; }
dd { margin: 0 0 .8rem; white-space: pre-wrap; overflow-wrap: anywhere; }
dt { font-weight: bold; }
.signatures { display: flex; gap: 4rem; margin-top: 3rem; }
</style></head>
<body>
<h1 dir="auto">{{ $terms['template_name'] }}</h1>
<p>{{ $contract->contract_number }} · {{ $contract->start_date }} — {{ $contract->end_date }}</p>
<dl>
@foreach($terms as $key => $value)
@if($value !== null)
<dt>{{ str_replace('_', ' ', ucfirst($key)) }}</dt><dd dir="auto">{{ $value }}</dd>
@endif
@endforeach
</dl>
<div class="signatures"><span>MenuPilot: __________________</span><span>Restaurant: __________________</span></div>
</body></html>
