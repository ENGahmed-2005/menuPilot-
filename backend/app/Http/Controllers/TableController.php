<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class TableController extends Controller
{
    private function out($data, $status = 200) { return response()->json(['data' => $data], $status); }

    private function query(Request $request)
    {
        return DB::table('restaurant_tables')->where('user_id', $request->user()->id);
    }

    private function withQr($table)
    {
        if (!$table) return $table;

        $activeSession = DB::table('dining_sessions')
            ->where('restaurant_table_id', $table->id)
            ->whereNull('closed_at')
            ->latest('id')
            ->first();

        $table->activeSessionId = $activeSession?->id;
        $table->status = $activeSession ? 'occupied' : 'available';
        $table->qrCodeUrl = '/t/' . $table->table_code;
        return $table;
    }

    private function listWithQr($tables) { return $tables->map(fn ($table) => $this->withQr($table)); }

    public function index(Request $request)
    {
        return $this->out($this->listWithQr($this->query($request)->orderBy('id')->get()));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'label' => ['required', 'string', 'max:100', function ($attribute, $value, $fail) use ($request) {
                if (DB::table('restaurant_tables')->where('user_id', $request->user()->id)->whereRaw('LOWER(label) = ?', [Str::lower(trim($value))])->exists()) {
                    $fail('اسم الطاولة مستخدم مسبقًا.');
                }
            }],
            'seats' => 'required|integer|min:1|max:100',
        ]);
        $v = $validator->validate();

        do { $code = Str::upper(Str::random(10)); }
        while (DB::table('restaurant_tables')->where('table_code', $code)->exists());

        $id = DB::table('restaurant_tables')->insertGetId([
            'user_id' => $request->user()->id,
            'label' => trim($v['label']),
            'seats' => $v['seats'],
            'table_code' => $code,
            'status' => 'available',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->out($this->withQr(DB::table('restaurant_tables')->find($id)), 201);
    }

    public function update(Request $request, $id)
    {
        $table = $this->query($request)->where('id', $id)->first();
        if (!$table) return response()->json(['message' => 'Table not found'], 404);

        $validator = Validator::make($request->all(), [
            'label' => ['sometimes', 'required', 'string', 'max:100', function ($attribute, $value, $fail) use ($request, $id) {
                if (DB::table('restaurant_tables')->where('user_id', $request->user()->id)->where('id', '!=', $id)->whereRaw('LOWER(label) = ?', [Str::lower(trim($value))])->exists()) {
                    $fail('اسم الطاولة مستخدم مسبقًا.');
                }
            }],
            'seats' => 'sometimes|required|integer|min:1|max:100',
        ]);
        $v = $validator->validate();
        if (isset($v['label'])) $v['label'] = trim($v['label']);

        $this->query($request)->where('id', $id)->update(array_merge($v, ['updated_at' => now()]));
        return $this->out($this->withQr(DB::table('restaurant_tables')->find($id)));
    }

    public function destroy(Request $request, $id)
    {
        if (DB::table('dining_sessions')->where('restaurant_table_id', $id)->whereNull('closed_at')->exists()) {
            return response()->json(['message' => 'لا يمكن حذف طاولة عليها جلسة نشطة.'], 409);
        }
        $deleted = $this->query($request)->where('id', $id)->delete();
        return $deleted ? $this->out(['message' => 'Deleted']) : response()->json(['message' => 'Table not found'], 404);
    }

    public function status(Request $request, $id)
    {
        $table = $this->query($request)->find($id);
        if (!$table) return response()->json(['message' => 'Table not found'], 404);
        return $this->out($this->withQr($table));
    }
}
