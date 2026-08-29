<?php

namespace App\Http\Requests;

class StorePostRequest
{
    public function rules()
    {
        return [
            'title' => 'required|string|min:3|max:100',
            'body' => 'required|string',
            'views' => 'integer|min:0',
            'is_published' => 'boolean',
        ];
    }
}
