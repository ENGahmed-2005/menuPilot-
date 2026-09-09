<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class RegisterRequest extends FormRequest { public function authorize():bool{return true;} protected function prepareForValidation():void{$this->merge(['email'=>strtolower(trim((string)$this->email)),'name'=>$this->name?:$this->restaurant_name]);} public function rules():array{return ['name'=>['nullable','string','max:255'],'restaurant_name'=>['required','string','max:255'],'email'=>['required','string','email','max:255','unique:owners,email'],'password'=>['required','string','min:8','confirmed'],'password_confirmation'=>['required','string'],'phone'=>['nullable','string','max:20'],'plan'=>['nullable','string','max:50']];} }
