//This file is licensed under EUPL v1.2 as part of the Digital Earth Viewer
export class Vec2{
    public x1: number;
    public x2: number;

    constructor(x1: number, x2: number){
        this.x1 = x1;
        this.x2 = x2;
    }

    public mul(rhs: number): Vec2 {
        return new Vec2(this.x1 * rhs, this.x2 * rhs);
    }

    public add(rhs: Vec2): Vec2 {
        return new Vec2(this.x1 + rhs.x1, this.x2 + rhs.x2);
    }

    public sub(rhs: Vec2): Vec2{
        return new Vec2(this.x1 - rhs.x1, this.x2 - rhs.x2);
    }

    public neg(): Vec2{
        return new Vec2(-this.x1, -this.x2);
    }

    public dot(rhs: Vec2) : number {
        return this.x1 * rhs.x1 + this.x2 * rhs.x2;
    }
    public cross(rhs: Vec2) : number {
        return this.x1 * rhs.x2 - this.x2 * rhs.x1;
    }

    public abs() : number {
        return Math.sqrt(this.x1 * this.x1 + this.x2 * this.x2);
    }

    public norm() : Vec2 {
        return this.mul(1.0 / this.abs());
    }

    ///Returns the vector with the components swapped
    public transpose(): Vec2{
        return new Vec2(this.x2, this.x1);
    }

    ///Returns the vector with the components swapped
    public orthogonal(): Vec2{
        let sign = Math.sign(this.x2);
        return new Vec2(Math.abs(this.x2), sign * -1.0 * this.x1);
    }

    public len(): number{
        return Math.sqrt((this.x1 * this.x1) + (this.x2 * this.x2));
    }
}


export class Vec3 {
    public x1: number;
    public x2: number;
    public x3: number;

    constructor(x1: number, x2: number, x3: number){
        this.x1 = x1;
        this.x2 = x2;
        this.x3 = x3;
    }

    public static empty() : Vec3 {
        return new Vec3(
            0.0,
            0.0,
            0.0,
        );
    }

    public static from_fv(x1: number, x2x3: Vec2) : Vec3 {
        return new Vec3(
            x1,
            x2x3.x1,
            x2x3.x2,
        );
    }

    public static from_vf(x1x2: Vec2, x3: number) : Vec3 {
        return new Vec3(
            x1x2.x1,
            x1x2.x2,
            x3,
        );
    }

    public dot(rhs: Vec3) : number {
        return this.x1 * rhs.x1 + this.x2 * rhs.x2 + this.x3 * rhs.x3;
    }

    public cross(rhs: Vec3) : Vec3 {
        return new Vec3(
            this.x2 * rhs.x3 - this.x3 * rhs.x2,
            this.x3 * rhs.x1 - this.x1 * rhs.x3,
            this.x1 * rhs.x2 - this.x2 * rhs.x1,
        );
    }
    
    public dyadic(rhs: Vec3) : Mat3 {
        return new Mat3(
            this.x1 * rhs.x1,
            this.x1 * rhs.x2,
            this.x1 * rhs.x3,
            this.x2 * rhs.x1,
            this.x2 * rhs.x2,
            this.x2 * rhs.x3,
            this.x3 * rhs.x1,
            this.x3 * rhs.x2,
            this.x3 * rhs.x3
        );
    }

    public abs() : number {
        return Math.sqrt(this.x1 * this.x1 + this.x2 * this.x2 + this.x3 * this.x3);
    }

    public norm() : Vec3 {
        return this.mul(1.0 / this.abs());
    }

    public mul(rhs: number) : Vec3 {
        return new Vec3(this.x1 * rhs, this.x2 * rhs, this.x3 * rhs);
    }

    public add(rhs: Vec3) : Vec3 {
        return new Vec3(this.x1 + rhs.x1, this.x2 + rhs.x2, this.x3 + rhs.x3);
    }

    public sub(rhs: Vec3) : Vec3 {
        return new Vec3(this.x1 - rhs.x1, this.x2 - rhs.x2, this.x3 - rhs.x3);
    }

    public neg() : Vec3 {
        return new Vec3(-this.x1, -this.x2, -this.x3);
    }

    public ortho() : Vec3 {
        if (this.x1 == 0 && this.x2 == 0) return new Vec3(1, 0, 0);
        return new Vec3(this.x2, -this.x1, 0).norm();
    }
}


export class Vec4{
    public x1: number;
    public x2: number;
    public x3: number;
    public x4: number;

    constructor(r: number, g: number, b: number, a: number){
            this.x1 = r;
            this.x2 = g;
            this.x3 = b;
            this.x4 = a;
    }

    public static empty(): Vec4 {
        return new Vec4 (
            0.0,
            0.0,
            0.0,
            0.0,
        );
    }

    public static from_vff(rg: Vec2, b: number, a: number) : Vec4 {
        return new Vec4(
            rg.x1,
            rg.x2,
            b,
            a
        );
    }

    public static from_vf(rgb: Vec3, a: number) : Vec4 {
        return new Vec4(
            rgb.x1,
            rgb.x2,
            rgb.x3,
            a
        );
    }

    public static from_fvf(r: number, gb: Vec2, a: number) : Vec4 {
        return new Vec4 (
            r,
            gb.x1,
            gb.x2,
            a
        );
    }

    public static from_ffv(r: number, g: number, ba: Vec2) : Vec4 {
        return new Vec4 (
            r,
            g,
            ba.x1,
            ba.x2,
        );
    }

    public static from_fv(r: number, gba: Vec3) : Vec4 {
        return new Vec4 (
            r,
            gba.x1,
            gba.x2,
            gba.x3,
        );
    }

    public static from_vv(rg: Vec2, ba: Vec2) : Vec4 {
        return new Vec4(
            rg.x1,
            rg.x2,
            ba.x1,
            ba.x2,
        );
    }

    public dot(rhs: Vec4) : number {
        return this.x1 * rhs.x1 + this.x2 * rhs.x2 + this.x3 * rhs.x3 + this.x4 * rhs.x4;
    }

    public abs() : number {
        return Math.sqrt(this.x1 * this.x1 + this.x2 * this.x2 + this.x3 * this.x3 + this.x4 * this.x4);
    }

    public norm() : Vec4 {
        return this.mul(1.0 / this.abs());
    }

    public mul(rhs: number) : Vec4 {
        return new Vec4(this.x1 * rhs, this.x2 * rhs, this.x3 * rhs, this.x4 * rhs);
    }

    public add(rhs: Vec4) : Vec4 {
        return new Vec4(
            this.x1 + rhs.x1,
            this.x2 + rhs.x2,
            this.x3 + rhs.x3,
            this.x4 + rhs.x4,
        );
    }

    public sub(rhs: Vec4) : Vec4 {
        return new Vec4(
            this.x1 - rhs.x1,
            this.x2 - rhs.x2,
            this.x3 - rhs.x3,
            this.x4 - rhs.x4,
        );
    }

    public neg() : Vec4 {
        return new Vec4(-this.x1, -this.x2, -this.x3, -this.x4);
    }

    public rgb() : Vec3 {
        return new Vec3(this.x1, this.x2, this.x3);
    }
}

export class Quaternion{
    public w: number;
    public x: number;
    public y: number;
    public z: number;
    
    constructor(w: number, x: number, y: number, z: number){
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public mul_scalar(scalar: number): Quaternion{
        return new Quaternion(
            this.w * scalar,
            this.x * scalar,
            this.y * scalar,
            this.z * scalar
        );
    }

    public add(rhs: Quaternion): Quaternion{
        return new Quaternion(
            this.w + rhs.w,
            this.x + rhs.x,
            this.y + rhs.y,
            this.z + rhs.z
        );
    }

    public sub(rhs: Quaternion): Quaternion{
        return new Quaternion(
            this.w - rhs.w,
            this.x - rhs.x,
            this.y - rhs.y,
            this.z - rhs.z
        );
    }

    public mul(rhs: Quaternion): Quaternion{
        return new Quaternion(
            (
                  (this.w * rhs.w)
                - (this.x * rhs.x)
                - (this.y * rhs.y)
                - (this.z * rhs.z)
            ),
            (
                  (this.w * rhs.x)
                + (this.x * rhs.w)
                + (this.y * rhs.z)
                - (this.z * rhs.y)
            ),
            (
                  (this.w * rhs.y)
                - (this.x * rhs.z)
                + (this.y * rhs.w)
                + (this.z * rhs.x)
            ),
            (
                  (this.w * rhs.z)
                + (this.x * rhs.y)
                - (this.y * rhs.x)
                + (this.z * rhs.w)
            )
        )
    }

    public normalize(): Quaternion{
        let len = this.length();
        return new Quaternion(
            this.w / len,
            this.x / len,
            this.y / len,
            this.z / len
        )
    }

    public norm(): number{
        return Math.pow(this.w, 2) + Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2);
    }

    public length(): number{
        return Math.sqrt(this.norm());
    }

    public conjugate(): Quaternion{
        return new Quaternion(
            this.w,
            -this.x,
            -this.y,
            -this.z
        );
    }

    public invert(): Quaternion{
        return this.mul_scalar(1 / this.norm());
    }

    public neg(): Quaternion{
        return this.mul_scalar(-1);
    }

    public static fromVec4(v: Vec4): Quaternion{
        return new Quaternion(v.x1, v.x2, v.x3, v.x4);
    }

    public to_rotation_matrix(): Mat3{
        return new Mat3(
            1 - (2 * (Math.pow(this.y, 2) + Math.pow(this.z, 2))),   (-2 * this.w * this.z) + (2 * this.x * this.y),          (2 * this.w * this.y) + (2 * this.x * this.z),

            (2 * this.w * this.z) + (2 * this.x * this.y),           1 - (2 * (Math.pow(this.x, 2) + Math.pow(this.z, 2))),   (-2 * this.w * this.x) + (2 * this.y * this.z),

            (-2 * this.w * this.y) + (2 * this.x * this.z),          (2* this.w * this.x) + (2 * this.y * this.z),            1 - (2 * (Math.pow(this.x, 2) + Math.pow(this.y, 2)))
        )
    }

    public static from_rotation_matrix(rot: Mat3): Quaternion{
        let trace = 1 + rot.a11 + rot.a22 + rot.a33;
        if(trace <= 0){
            throw "The trace of the rotation matrix needs to be larger than zero to construct a quaternion from it";
        }
        return new Quaternion(
            trace,
            rot.a32 - rot.a23,
            rot.a13 - rot.a31,
            rot.a21 - rot.a12
        )
    }

    public static from_axis_and_angle(axis: Vec3, angle: number): Quaternion{
        let normal_axis = axis.norm();
        let sin_a_half = Math.sin(angle / 2);
        return new Quaternion(
            Math.cos(angle / 2),
            normal_axis.x1 * sin_a_half,
            normal_axis.x2 * sin_a_half,
            normal_axis.x3 * sin_a_half
        );
    }
}



export class Mat2 {
    public a11: number;
    public a12: number;
    public a21: number;
    public a22: number;

    constructor(a11: number, a12: number, a21: number, a22: number){
        this.a11 = a11;
        this.a12 = a12;
        this.a21 = a21;
        this.a22 = a22;
    }

    public static from_cols(a1: Vec2, a2: Vec2) : Mat2 {
        return new Mat2(
            a1.x1,
            a2.x1,
            a1.x2,
            a2.x2,
        );
    }

    public static from_lins(a1: Vec2, a2: Vec2) : Mat2 {
        return new Mat2(
            a1.x1,
            a1.x2,
            a2.x1,
            a2.x2,
        );
    }

    public static rot(phi: number) : Mat2 {
        return new Mat2(
            Math.cos(phi),
            -(Math.sin(phi)),
            Math.sin(phi),
            Math.cos(phi),
        );
    }

    public static identity() : Mat2 {
        return new Mat2(
            1.0,
            0.0,
            0.0,
            1.0,
        );
    }

    public transpose() : Mat2 {
        return new Mat2(
            this.a11,
            this.a21,
            this.a12,
            this.a22,
        );
    }

    public det() : number {
        return this.a11 * this.a22 - this.a12 * this.a21;
    }

    public adj() : Mat2 {
        return new Mat2(
            this.a22,
            -this.a12,
            -this.a21,
            this.a11,
        );
    }

    // public inverse() : Mat2{
    //     if(this.det() == 0.0){
    //         return null;
    //     } else {
    //         return this.adj().mul_number(1.0 / this.det());
    //     }
    // }

    public mul_number(rhs: number) : Mat2{
        return new Mat2(
            this.a11 * rhs,
            this.a12 * rhs,
            this.a21 * rhs,
            this.a22 * rhs,
        );
    }

    public mul_vec2(rhs: Vec2) : Vec2 {
        return new Vec2(
            this.a11 * rhs.x1 + this.a12 * rhs.x2,
            this.a21 * rhs.x1 + this.a22 * rhs.x2,
        );
    }

    public mul_mat2(rhs: Mat2) : Mat2 {
        return new Mat2(
            this.a11 * rhs.a11 + this.a12 * rhs.a21,
            this.a11 * rhs.a12 + this.a12 * rhs.a22,
            this.a21 * rhs.a11 + this.a22 * rhs.a21,
            this.a21 * rhs.a12 + this.a22 * rhs.a22,
        );
    }
}

export class Mat3 {
    public a11: number;
    public a12: number;
    public a13: number;
    public a21: number;
    public a22: number;
    public a23: number;
    public a31: number;
    public a32: number;
    public a33: number;

    constructor(a11: number, a12: number, a13: number, a21: number, a22: number, a23: number, a31: number, a32: number, a33: number){
        this.a11 = a11;
        this.a12 = a12;
        this.a13 = a13;
        this.a21 = a21;
        this.a22 = a22;
        this.a23 = a23;
        this.a31 = a31;
        this.a32 = a32;
        this.a33 = a33;
    }

    public static from_cols(a1: Vec3, a2: Vec3, a3: Vec3) : Mat3 {
        return new Mat3(
            a1.x1,
            a2.x1,
            a3.x1,
            a1.x2,
            a2.x2,
            a3.x2,
            a1.x3,
            a2.x3,
            a3.x3,
        );
    }

    public static from_lins(a1: Vec3, a2: Vec3, a3: Vec3) : Mat3 {
        return new Mat3(
            a1.x1,
            a1.x2,
            a1.x3,
            a2.x1,
            a2.x2,
            a2.x3,
            a3.x1,
            a3.x2,
            a3.x3,
        );
    }

    public static identity() : Mat3 {
        return new Mat3(
            1.0,
            0.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            1.0,
        )
    }

    public static rot(phi: number, axis: Vec3) : Mat3 {
        let s = Math.sin(phi);
        let c = Math.cos(phi);
        let c1 = 1.0 - c;
        let n = axis.norm();
        return new Mat3(
            n.x1 * n.x1 * c1 + c,
            n.x1 * n.x2 * c1 - n.x3 * s,
            n.x1 * n.x3 * c1 + n.x2 * s,
            n.x2 * n.x1 * c1 + n.x3 * s,
            n.x2 * n.x2 * c1 + c,
            n.x2 * n.x3 * c1 - n.x1 * s,
            n.x3 * n.x1 * c1 - n.x2 * s,
            n.x3 * n.x2 * c1 + n.x1 * s,
            n.x3 * n.x3 * c1 + c,
        );
    }

    public translate(offset: Vec3) : Mat4 {
        return new Mat4(
            this.a11,
            this.a12,
            this.a13,
            offset.x1,
            this.a21,
            this.a22,
            this.a23,
            offset.x2,
            this.a31,
            this.a32,
            this.a33,
            offset.x3,
            0.0,
            0.0,
            0.0,
            1.0,
        );
    }

    public extend() : Mat4 {
        return new Mat4(
            this.a11,
            this.a12,
            this.a13,
            0.0,
            this.a21,
            this.a22,
            this.a23,
            0.0,
            this.a31,
            this.a32,
            this.a33,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0,
        );
    }

    public transpose() : Mat3 {
        return new Mat3(
            this.a11,
            this.a21,
            this.a31,
            this.a12,
            this.a22,
            this.a32,
            this.a13,
            this.a23,
            this.a33,
        );
    }

    public det() : number {
        return (this.a11
            * new Mat2(
                this.a22,
                this.a23,
                this.a32,
                this.a33,
            )
            .det()
            - this.a21
                * new Mat2(
                    this.a12,
                    this.a13,
                    this.a32,
                    this.a33,
                )
                .det()
            + this.a31
                * new Mat2 (
                    this.a12,
                    this.a13,
                    this.a22,
                    this.a23,
                )
                .det());
    }

    public adj() : Mat3 {
        return new Mat3(
            new Mat2(
                this.a22,
                this.a23,
                this.a32,
                this.a33,
            )
            .det(),
            - new Mat2(
                this.a21,
                this.a23,
                this.a31,
                this.a33,
            )
            .det(),
            new Mat2(
                this.a21,
                this.a22,
                this.a31,
                this.a32,
            )
            .det(),
            - new Mat2(
                this.a12,
                this.a13,
                this.a32,
                this.a33,
            )
            .det(),
            new Mat2(
                this.a11,
                this.a13,
                this.a31,
                this.a33,
            )
            .det(),
            - new Mat2(
                this.a11,
                this.a12,
                this.a31,
                this.a32,
            ).det(),
            new Mat2(
                this.a12,
                this.a13,
                this.a22,
                this.a23,
            )
            .det(),
            - new Mat2(
                this.a11,
                this.a13,
                this.a21,
                this.a23,
            )
            .det(),
            new Mat2(
                this.a11,
                this.a12,
                this.a21,
                this.a22,
            )
            .det(),
        )
        .transpose();
    }

    // public inverse() : Mat3 {
    //     if(this.det() == 0.0){
    //         return null
    //     } else {
    //         return (this.adj().mul_number(1.0 / this.det()))
    //     }
    // }
    
    public mul_number(rhs: number) : Mat3{
        return new Mat3(
            this.a11 * rhs,
            this.a12 * rhs,
            this.a13 * rhs,
            this.a21 * rhs,
            this.a22 * rhs,
            this.a23 * rhs,
            this.a31 * rhs,
            this.a32 * rhs,
            this.a33 * rhs,
        );
    }

    public mul_vec3(rhs: Vec3) : Vec3 {
        return new Vec3(
            this.a11 * rhs.x1 + this.a12 * rhs.x2 + this.a13 * rhs.x3,
            this.a21 * rhs.x1 + this.a22 * rhs.x2 + this.a23 * rhs.x3,
            this.a31 * rhs.x1 + this.a32 * rhs.x2 + this.a33 * rhs.x3,
        );
    }

    public mul_mat3(rhs: Mat3): Mat3 {
        return new Mat3(
            this.a11 * rhs.a11 + this.a12 * rhs.a21 + this.a13 * rhs.a31,
            this.a11 * rhs.a12 + this.a12 * rhs.a22 + this.a13 * rhs.a32,
            this.a11 * rhs.a13 + this.a12 * rhs.a23 + this.a13 * rhs.a33,
            this.a21 * rhs.a11 + this.a22 * rhs.a21 + this.a23 * rhs.a31,
            this.a21 * rhs.a12 + this.a22 * rhs.a22 + this.a23 * rhs.a32,
            this.a21 * rhs.a13 + this.a22 * rhs.a23 + this.a23 * rhs.a33,
            this.a31 * rhs.a11 + this.a32 * rhs.a21 + this.a33 * rhs.a31,
            this.a31 * rhs.a12 + this.a32 * rhs.a22 + this.a33 * rhs.a32,
            this.a31 * rhs.a13 + this.a32 * rhs.a23 + this.a33 * rhs.a33,
        );
    }
}

{
    let q1 = Quaternion.from_axis_and_angle(new Vec3(1, 2, 3), 1);
    let m1 = Mat3.rot(1, new Vec3(1, 2, 3));
    let q2 = Quaternion.from_axis_and_angle(new Vec3(-1, 2, 3), 1);
    let m2 = Mat3.rot(1, new Vec3(-1, 2, 3));
    let q3 = q1.mul(q2);
    let m3 = m1.mul_mat3(m2);
}

export class Mat4 {
    public a11: number;
    public a12: number;
    public a13: number;
    public a14: number;
    public a21: number;
    public a22: number;
    public a23: number;
    public a24: number;
    public a31: number;
    public a32: number;
    public a33: number;
    public a34: number;
    public a41: number;
    public a42: number;
    public a43: number;
    public a44: number;

    constructor(a11: number, a12: number, a13: number, a14: number, a21: number, a22: number, a23: number, a24: number, a31: number, a32: number, a33: number, a34: number, a41: number, a42: number, a43: number, a44: number){
        this.a11 = a11;
        this.a12 = a12;
        this.a13 = a13;
        this.a14 = a14;
        this.a21 = a21;
        this.a22 = a22;
        this.a23 = a23;
        this.a24 = a24;
        this.a31 = a31;
        this.a32 = a32;
        this.a33 = a33;
        this.a34 = a34;
        this.a41 = a41;
        this.a42 = a42;
        this.a43 = a43;
        this.a44 = a44;
    }

    public static from_cols(a1: Vec4, a2: Vec4, a3: Vec4, a4: Vec4) : Mat4 {
        return new Mat4(
            a1.x1,
            a2.x1,
            a3.x1,
            a4.x1,
            a1.x2,
            a2.x2,
            a3.x2,
            a4.x2,
            a1.x3,
            a2.x3,
            a3.x3,
            a4.x3,
            a1.x4,
            a2.x4,
            a3.x4,
            a4.x4,
        );
    }

    public as_cols(): Vec4[] {
        return [
            new Vec4(this.a11, this.a21, this.a31, this.a41),
            new Vec4(this.a12, this.a22, this.a32, this.a42),
            new Vec4(this.a13, this.a23, this.a33, this.a43),
            new Vec4(this.a14, this.a24, this.a34, this.a44)
        ];
    }

    public static from_lins(a1: Vec4, a2: Vec4, a3: Vec4, a4: Vec4) : Mat4 {
        return new Mat4(
            a1.x1,
            a1.x2,
            a1.x3,
            a1.x4,
            a2.x1,
            a2.x2,
            a2.x3,
            a2.x4,
            a3.x1,
            a3.x2,
            a3.x3,
            a3.x4,
            a4.x1,
            a4.x2,
            a4.x3,
            a4.x4,
        );
    }

    public static identity() : Mat4 {
        return new Mat4(
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0,
        );
    }

    //Field of view angle is based on the cone that the frustum touches from the inside. Should give a more uniform FOV between different aspect ratios.
    public static perspective(fov: number, aspect: number, near: number, far: number) : Mat4 {
        var x = 1 / Math.tan(fov / 2);
        var y = aspect / Math.tan(fov / 2);
        var c = (far + near) / (far - near);
        var d = -2 * far * near / (far - near);

        return new Mat4(
            x,   0.0, 0.0, 0.0,
            0.0,   y, 0.0, 0.0,
            0.0, 0.0,   c,   d,
            0.0, 0.0, 1.0, 0.0
        );
    }

    public static perspective_ext(left: number, right: number, top: number, bottom: number, near: number, far: number): Mat4 {
        var x = 2 / (right - left);
        var y = 2 / (top - bottom);
        
        var a = (right + left) / (right - left);
        var b = (top + bottom) / (top - bottom);

        var c = (far + near) / (far - near);
        var d = - 2 * far * near / (far - near);
        
        return new Mat4(
            x,   0.0, a,   0.0,
            0.0, y,   b,   0.0,
            0.0, 0.0, c,   d,
            0.0, 0.0, 1.0, 0.0
        );
    }
 
    public transpose() : Mat4 {
        return new Mat4(
            this.a11,
            this.a21,
            this.a31,
            this.a41,
            this.a12,
            this.a22,
            this.a32,
            this.a42,
            this.a13,
            this.a23,
            this.a33,
            this.a43,
            this.a14,
            this.a24,
            this.a34,
            this.a44,
        );
    }

    public static look_at(from: Vec3, to: Vec3, up: Vec3) : Mat4{
        let z = to.sub(from).norm();
        let x = up.cross(z).norm();
        let y = z.cross(x);
        let m = Mat3.from_cols(x, y, z);
        return Mat3.identity().translate(from).mul_mat4(m.extend());
    }

    //Auto-transposes the Matrix for GL loading
    public as_typed(): Float32Array {
        return new Float32Array([
        this.a11,
        this.a21,
        this.a31,
        this.a41,
        this.a12,
        this.a22,
        this.a32,
        this.a42,
        this.a13,
        this.a23,
        this.a33,
        this.a43,
        this.a14,
        this.a24,
        this.a34,
        this.a44
        ]);
    }

    public det() : number {
        return (this.a11
            * new Mat3(
                this.a22,
                this.a23,
                this.a24,
                this.a32,
                this.a33,
                this.a34,
                this.a42,
                this.a43,
                this.a44,
            )
            .det()
            - this.a21
                * new Mat3(
                    this.a12,
                    this.a13,
                    this.a14,
                    this.a32,
                    this.a33,
                    this.a34,
                    this.a42,
                    this.a43,
                    this.a44,
                )
                .det()
            + this.a31
                * new Mat3(
                    this.a12,
                    this.a13,
                    this.a14,
                    this.a22,
                    this.a23,
                    this.a24,
                    this.a42,
                    this.a43,
                    this.a44,
                )
                .det()
            - this.a41
                * new Mat3(
                    this.a12,
                    this.a13,
                    this.a14,
                    this.a22,
                    this.a23,
                    this.a24,
                    this.a32,
                    this.a33,
                    this.a34,
                )
                .det()
        );
    }

    public adj() : Mat4 {
        return new Mat4(
            new Mat3(
                this.a22,
                this.a23,
                this.a24,
                this.a32,
                this.a33,
                this.a34,
                this.a42,
                this.a43,
                this.a44,
            )
            .det(),
            -new Mat3 (
                this.a21,
                this.a23,
                this.a24,
                this.a31,
                this.a33,
                this.a34,
                this.a41,
                this.a43,
                this.a44,
            )
            .det(),
            new Mat3 (
                this.a21,
                this.a22,
                this.a24,
                this.a31,
                this.a32,
                this.a34,
                this.a41,
                this.a42,
                this.a44,
            )
            .det(),
            -new Mat3 (
                this.a21,
                this.a22,
                this.a23,
                this.a31,
                this.a32,
                this.a33,
                this.a41,
                this.a42,
                this.a43,
            )
            .det(),
            -new Mat3 (
                this.a12,
                this.a13,
                this.a14,
                this.a32,
                this.a33,
                this.a34,
                this.a42,
                this.a43,
                this.a44,
            )
            .det(),
            new Mat3 (
                this.a11,
                this.a13,
                this.a14,
                this.a31,
                this.a33,
                this.a34,
                this.a41,
                this.a43,
                this.a44,
            )
            .det(),
            -new Mat3 (
                this.a11,
                this.a12,
                this.a14,
                this.a31,
                this.a32,
                this.a34,
                this.a41,
                this.a42,
                this.a44,
            )
            .det(),
            new Mat3 (
                this.a11,
                this.a12,
                this.a13,
                this.a31,
                this.a32,
                this.a33,
                this.a41,
                this.a42,
                this.a43,
            )
            .det(),
            new Mat3 (
                this.a12,
                this.a13,
                this.a14,
                this.a22,
                this.a23,
                this.a24,
                this.a42,
                this.a43,
                this.a44,
            )
            .det(),
            -new Mat3 (
                this.a11,
                this.a13,
                this.a14,
                this.a21,
                this.a23,
                this.a24,
                this.a41,
                this.a43,
                this.a44,
            )
            .det(),
            new Mat3 (
                this.a11,
                this.a12,
                this.a14,
                this.a21,
                this.a22,
                this.a24,
                this.a41,
                this.a42,
                this.a44,
            )
            .det(),
            -new Mat3 (
                this.a11,
                this.a12,
                this.a13,
                this.a21,
                this.a22,
                this.a23,
                this.a41,
                this.a42,
                this.a43,
            )
            .det(),
            -new Mat3 (
                this.a12,
                this.a13,
                this.a14,
                this.a22,
                this.a23,
                this.a24,
                this.a32,
                this.a33,
                this.a34,
            )
            .det(),
            new Mat3 (
                this.a11,
                this.a13,
                this.a14,
                this.a21,
                this.a23,
                this.a24,
                this.a31,
                this.a33,
                this.a34,
            )
            .det(),
            -new Mat3 (
                this.a11,
                this.a12,
                this.a14,
                this.a21,
                this.a22,
                this.a24,
                this.a31,
                this.a32,
                this.a34,
            )
            .det(),
            new Mat3 (
                this.a11,
                this.a12,
                this.a13,
                this.a21,
                this.a22,
                this.a23,
                this.a31,
                this.a32,
                this.a33,
            )
            .det(),
        )
        .transpose()
    }

    // public inverse(): Mat4 {
    //     if(this.det() == 0.0){
    //         return null;
    //     } else {
    //         return (this.adj().mul_number(1.0 / this.det()));
    //     }
    // }

    public mul_number(rhs: number) : Mat4{
        return new Mat4(
            this.a11 * rhs,
            this.a12 * rhs,
            this.a13 * rhs,
            this.a14 * rhs,
            this.a21 * rhs,
            this.a22 * rhs,
            this.a23 * rhs,
            this.a24 * rhs,
            this.a31 * rhs,
            this.a32 * rhs,
            this.a33 * rhs,
            this.a34 * rhs,
            this.a41 * rhs,
            this.a42 * rhs,
            this.a43 * rhs,
            this.a44 * rhs,
        )
    }

    public mul_vec4(rhs: Vec4) : Vec4 {
        return new Vec4(
            this.a11 * rhs.x1 + this.a12 * rhs.x2 + this.a13 * rhs.x3 + this.a14 * rhs.x4,
            this.a21 * rhs.x1 + this.a22 * rhs.x2 + this.a23 * rhs.x3 + this.a24 * rhs.x4,
            this.a31 * rhs.x1 + this.a32 * rhs.x2 + this.a33 * rhs.x3 + this.a34 * rhs.x4,
            this.a41 * rhs.x1 + this.a42 * rhs.x2 + this.a43 * rhs.x3 + this.a44 * rhs.x4,
        );
    }

    public mul_mat4(rhs: Mat4) : Mat4 {
        return new Mat4(
            this.a11 * rhs.a11 + this.a12 * rhs.a21 + this.a13 * rhs.a31 + this.a14 * rhs.a41,
            this.a11 * rhs.a12 + this.a12 * rhs.a22 + this.a13 * rhs.a32 + this.a14 * rhs.a42,
            this.a11 * rhs.a13 + this.a12 * rhs.a23 + this.a13 * rhs.a33 + this.a14 * rhs.a43,
            this.a11 * rhs.a14 + this.a12 * rhs.a24 + this.a13 * rhs.a34 + this.a14 * rhs.a44,
            this.a21 * rhs.a11 + this.a22 * rhs.a21 + this.a23 * rhs.a31 + this.a24 * rhs.a41,
            this.a21 * rhs.a12 + this.a22 * rhs.a22 + this.a23 * rhs.a32 + this.a24 * rhs.a42,
            this.a21 * rhs.a13 + this.a22 * rhs.a23 + this.a23 * rhs.a33 + this.a24 * rhs.a43,
            this.a21 * rhs.a14 + this.a22 * rhs.a24 + this.a23 * rhs.a34 + this.a24 * rhs.a44,
            this.a31 * rhs.a11 + this.a32 * rhs.a21 + this.a33 * rhs.a31 + this.a34 * rhs.a41,
            this.a31 * rhs.a12 + this.a32 * rhs.a22 + this.a33 * rhs.a32 + this.a34 * rhs.a42,
            this.a31 * rhs.a13 + this.a32 * rhs.a23 + this.a33 * rhs.a33 + this.a34 * rhs.a43,
            this.a31 * rhs.a14 + this.a32 * rhs.a24 + this.a33 * rhs.a34 + this.a34 * rhs.a44,
            this.a41 * rhs.a11 + this.a42 * rhs.a21 + this.a43 * rhs.a31 + this.a44 * rhs.a41,
            this.a41 * rhs.a12 + this.a42 * rhs.a22 + this.a43 * rhs.a32 + this.a44 * rhs.a42,
            this.a41 * rhs.a13 + this.a42 * rhs.a23 + this.a43 * rhs.a33 + this.a44 * rhs.a43,
            this.a41 * rhs.a14 + this.a42 * rhs.a24 + this.a43 * rhs.a34 + this.a44 * rhs.a44,
        );
    }
}

export class AaBb {
    public max: Vec3;
    public min: Vec3;

    constructor(max: Vec3, min: Vec3){
        this.max = max;
        this.min = min;
    }

    public static from_point(p: Vec3) : AaBb {
        return new AaBb(p,p);
    }

    public get_corner(x1: boolean, x2: boolean, x3: boolean) : Vec3 {
        return new Vec3(
            x1 ? this.max.x1 : this.min.x1,
            x2 ? this.max.x2 : this.min.x2,
            x3 ? this.max.x3 : this.min.x3,
        )
    }

    public corners() : Vec3[] {
        return [
            this.get_corner(false, false, false),
            this.get_corner(false, false, true),
            this.get_corner(false, true, false),
            this.get_corner(false, true, true),
            this.get_corner(true, false, false),
            this.get_corner(true, false, true),
            this.get_corner(true, true, false),
            this.get_corner(true, true, true),
        ];
    }

    public check_for_all_corners(pred: (v: Vec3) => boolean): boolean {
        let v = new Vec3(this.min.x1, this.min.x2, this.min.x3); //000
        if(!pred(v))return false;
        v.x1 = this.max.x1; //001
        if(!pred(v))return false;
        v.x2 = this.max.x2; //011
        if(!pred(v))return false;
        v.x1 = this.min.x1; //010
        if(!pred(v))return false;
        v.x3 = this.max.x3; //110
        if(!pred(v))return false;
        v.x1 = this.max.x1; //111
        if(!pred(v))return false;
        v.x2 = this.min.x2; //101
        if(!pred(v))return false;
        v.x1 = this.min.x1;//100
        return pred(v);
    }

    public add_vec3(rhs: Vec3) : AaBb {
        return new AaBb(
            new Vec3 (
                Math.max(this.max.x1, rhs.x1),
                Math.max(this.max.x2, rhs.x2),
                Math.max(this.max.x3, rhs.x3),
            ),
            new Vec3 (
                Math.min(this.min.x1, rhs.x1),
                Math.min(this.min.x2, rhs.x2),
                Math.min(this.min.x3, rhs.x3),
            ),
        )
    }

    public add_aabb(rhs: AaBb) : AaBb {
        return new AaBb(
            new Vec3(
                Math.max(this.max.x1,rhs.max.x1),
                Math.max(this.max.x2,rhs.max.x2),
                Math.max(this.max.x3,rhs.max.x3),
            ),
            new Vec3(
                Math.min(this.min.x1,rhs.min.x1),
                Math.min(this.min.x2,rhs.min.x2),
                Math.min(this.min.x3,rhs.min.x3),
            ),
        );
    }
}
