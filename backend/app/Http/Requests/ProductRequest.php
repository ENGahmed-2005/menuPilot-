<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest; use Illuminate\Validation\Rule;
class ProductRequest extends FormRequest { public function authorize():bool{return true;} public function rules():array{$rid=$this->user()?->restaurant_id;return ['category_id'=>['required',Rule::exists('categories','id')->where(fn($q)=>$q->where('restaurant_id',$rid))],'name'=>['required','string','max:255'],'price'=>['required','numeric','min:0'],'image'=>['nullable','string','max:255'],'is_available'=>['nullable','boolean']];} }
